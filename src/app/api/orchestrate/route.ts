import { NextResponse } from "next/server";
import { AGENTS, WAVE_LABELS } from "@/lib/agents";
import { callData } from "@/lib/debugStore";
import type { AgentResult } from "@/lib/debugStore";

const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

async function callPerplexity(prompt: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: prompt + "\n\nReturn valid JSON: {\"finding\": \"...\", \"details\": [\"...\"], \"confidence\": <number>}" }],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

function parseAgentResponse(raw: string): { finding: string; details: string[]; confidence: number } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        finding: parsed.finding || "Analysis complete",
        details: Array.isArray(parsed.details) ? parsed.details : [],
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 85,
      };
    }
  } catch {
    // fallback
  }
  return { finding: raw.slice(0, 200) || "Analysis complete", details: [], confidence: 80 };
}

function buildContext(): string {
  const lines: string[] = [];
  if (callData.extracted.name) lines.push(`Patient: ${callData.extracted.name}`);
  if (callData.extracted.location) lines.push(`Location: ${callData.extracted.location}`);
  if (callData.extracted.situation) lines.push(`Situation: ${callData.extracted.situation}`);
  if (callData.extracted.urgency) lines.push(`Urgency: ${callData.extracted.urgency}`);
  if (callData.extracted.medicalNotes) lines.push(`Medical Notes: ${callData.extracted.medicalNotes}`);
  if (callData.extracted.actionNeeded) lines.push(`Action Needed: ${callData.extracted.actionNeeded}`);
  if (callData.patient) {
    lines.push(`Health Issue: ${callData.patient.health_issue}`);
    if (callData.patient.retrieved_memories.length > 0) {
      lines.push(`Patient History: ${callData.patient.retrieved_memories.join("; ")}`);
    }
  }
  if (callData.transcript.length > 0) {
    lines.push("\nCALL TRANSCRIPT:");
    callData.transcript.forEach((t) => lines.push(`${t.role}: ${t.text}`));
  }
  return lines.join("\n");
}

export async function POST() {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not configured" }, { status: 500 });
  }

  callData.orchestrationStatus = "running";
  callData.orchestrationProgress = 0;
  callData.agentResults = [];
  callData.diagnosisSummary = null;
  callData.procedures = [];
  callData.causes = [];

  const context = buildContext();
  const allFindings: Record<string, { finding: string; details: string[] }> = {};
  const waves = [1, 2, 3, 4, 5];
  const totalAgents = AGENTS.length;
  let completedCount = 0;

  try {
    for (const wave of waves) {
      const waveAgents = AGENTS.filter((a) => a.wave === wave);

      // Mark agents as running
      for (const agent of waveAgents) {
        const result: AgentResult = {
          id: agent.id, name: agent.name, model: agent.model,
          wave: agent.wave, type: agent.type,
          confidence: 0, finding: "", details: [], duration: 0, status: "running",
        };
        callData.agentResults.push(result);
      }

      // Build previous findings string
      const prevFindingsStr = Object.entries(allFindings)
        .map(([id, f]) => `[${id}]: ${f.finding}`)
        .join("\n");

      // Run agents in parallel within wave (sequential across waves)
      const promises = waveAgents.map(async (agent) => {
        const start = Date.now();
        const prompt = agent.promptTemplate
          .replace("{context}", context)
          .replace("{previousFindings}", prevFindingsStr || "None yet");

        let raw: string;
        if (agent.model.includes("Perplexity") || agent.model.includes("sonar")) {
          raw = PERPLEXITY_KEY ? await callPerplexity(prompt) : await callGemini(prompt);
        } else {
          raw = await callGemini(prompt);
        }

        const duration = Date.now() - start;
        const parsed = parseAgentResponse(raw);
        return { agentId: agent.id, ...parsed, duration };
      });

      const results = await Promise.all(promises);

      // Update store with results
      for (const r of results) {
        const stored = callData.agentResults.find((a) => a.id === r.agentId);
        if (stored) {
          stored.confidence = r.confidence;
          stored.finding = r.finding;
          stored.details = r.details;
          stored.duration = r.duration;
          stored.status = "complete";
        }
        allFindings[r.agentId] = { finding: r.finding, details: r.details };
        completedCount++;
      }

      callData.orchestrationProgress = Math.round((completedCount / totalAgents) * 80);
    }

    // Generate final diagnosis summary with Gemini
    const allFindingsStr = Object.entries(allFindings)
      .map(([id, f]) => `[${id}]: ${f.finding}\n  Details: ${f.details.join("; ")}`)
      .join("\n\n");

    const diagPrompt = `You are a clinical consensus engine. Based on all agent findings below, produce a final diagnosis summary.

PATIENT CONTEXT:
${context}

ALL AGENT FINDINGS:
${allFindingsStr}

Return JSON with this exact structure:
{
  "primary": "<primary diagnosis name>",
  "confidence": <0-100>,
  "riskLevel": "<LOW|MODERATE|MODERATE-HIGH|HIGH|CRITICAL>",
  "differentials": [{"diagnosis": "<name>", "probability": <0-100>, "status": "<primary|secondary|monitor|rule-out>"}],
  "treatments": [{"action": "<treatment>", "priority": "<IMMEDIATE|CONDITIONAL|SOON|SCHEDULED>", "timeframe": "<when>"}],
  "referrals": [{"specialty": "<name>", "urgency": "<Urgent|Conditional|Scheduled>", "timeframe": "<when>"}]
}`;

    const diagRaw = await callGemini(diagPrompt);
    try {
      const jsonMatch = diagRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const diag = JSON.parse(jsonMatch[0]);
        const totalDuration = callData.agentResults.reduce((s, a) => s + a.duration, 0);
        callData.diagnosisSummary = {
          primary: diag.primary || "Analysis Complete",
          confidence: diag.confidence || 85,
          riskLevel: diag.riskLevel || "MODERATE",
          differentials: Array.isArray(diag.differentials) ? diag.differentials : [],
          treatments: Array.isArray(diag.treatments) ? diag.treatments : [],
          referrals: Array.isArray(diag.referrals) ? diag.referrals : [],
          agentCount: totalAgents,
          modelsUsed: [...new Set(AGENTS.map((a) => a.model))],
          totalDuration,
        };
      }
    } catch {
      // Diagnosis parsing failed, leave null
    }

    callData.orchestrationProgress = 90;

    // Fire Perplexity calls for procedures and causes
    const patientSituation = callData.extracted.situation || callData.patient?.health_issue || "unknown condition";
    const diagName = callData.diagnosisSummary?.primary || patientSituation;

    const [procRaw, causeRaw] = await Promise.all([
      (PERPLEXITY_KEY ? callPerplexity : callGemini)(
        `Research current medical procedures and treatment options for: ${diagName}

Patient context: ${patientSituation}

Return JSON array of 4-6 procedures:
{"procedures": [{"title": "<procedure name>", "source": "<medical source>", "desc": "<2-3 sentence description>", "details": ["<detail 1>", "<detail 2>", ...]}]}`
      ),
      (PERPLEXITY_KEY ? callPerplexity : callGemini)(
        `Analyze possible causes and differential considerations for: ${diagName}

Patient context: ${patientSituation}

Return JSON array of 4-5 cause categories:
{"causes": [{"title": "<cause category>", "items": ["<item 1>", "<item 2>", ...]}]}`
      ),
    ]);

    // Parse procedures
    try {
      const pMatch = procRaw.match(/\{[\s\S]*\}/);
      if (pMatch) {
        const p = JSON.parse(pMatch[0]);
        if (Array.isArray(p.procedures)) {
          callData.procedures = p.procedures;
        }
      }
    } catch { /* ignore */ }

    // Parse causes
    try {
      const cMatch = causeRaw.match(/\{[\s\S]*\}/);
      if (cMatch) {
        const c = JSON.parse(cMatch[0]);
        if (Array.isArray(c.causes)) {
          callData.causes = c.causes;
        }
      }
    } catch { /* ignore */ }

    callData.orchestrationProgress = 100;
    callData.orchestrationStatus = "complete";

    return NextResponse.json({
      agents: callData.agentResults,
      diagnosis: callData.diagnosisSummary,
      procedures: callData.procedures,
      causes: callData.causes,
      orchestrationTime: callData.agentResults.reduce((s, a) => s + a.duration, 0),
      timestamp: Date.now(),
    });
  } catch (err) {
    callData.orchestrationStatus = "error";
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
