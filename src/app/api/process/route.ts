import { NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";
import { lookupByPhone, lookupByName, queryMemvAI } from "@/lib/memvLookup";

const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;

async function callPerplexity(prompt: string): Promise<string> {
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

function setStep(id: string, status: "active" | "done" | "error", detail?: string) {
  const step = callData.processingSteps.find((s) => s.id === id);
  if (step) {
    step.status = status;
    if (detail !== undefined) step.detail = detail;
  }
}

async function triggerOrchestration() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    await fetch(`${baseUrl}/api/orchestrate`, { method: "POST" });
  } catch {
    // Orchestration runs independently
  }
}

async function generatePatientDocument() {
  if (!GEMINI_KEY) return;

  const transcript = callData.transcript.map((t) => `${t.role}: ${t.text}`).join("\n");
  const memories = callData.patient?.retrieved_memories?.join("\n") || "None";

  const prompt = `You are generating a comprehensive patient medical document from a healthcare call. Use ALL available data.

TRANSCRIPT:
${transcript}

PATIENT RECORD:
Name: ${callData.extracted.name || "Unknown"}
Location: ${callData.extracted.location || "Unknown"}
Situation: ${callData.extracted.situation || "Unknown"}
Medical Notes: ${callData.extracted.medicalNotes || "Unknown"}
Action Needed: ${callData.extracted.actionNeeded || "Unknown"}

MEM[V] HISTORY:
${memories}

Generate a complete PatientData JSON object with these fields. Infer reasonable values from context. Use "Unknown" for truly unavailable data:
{
  "name": "<full name>",
  "dob": "<MM/DD/YYYY or Unknown>",
  "age": <number>,
  "sex": "<Male/Female/Unknown>",
  "mrn": "<MRN-XXXX generated>",
  "phone": "<phone or Unknown>",
  "location": "<location>",
  "bloodType": "<type or Unknown>",
  "weight": "<weight or Unknown>",
  "height": "<height or Unknown>",
  "bmi": "<bmi or Unknown>",
  "emergencyContact": {"name": "<name>", "phone": "<phone>", "relation": "<relation>"},
  "insurance": {"provider": "<provider>", "planName": "<plan>", "memberId": "<id>", "groupNumber": "<group>"},
  "allergies": [{"name": "<allergen>", "severity": "High|Medium|Low", "reaction": "<reaction>", "year": "<year>"}],
  "medications": [{"name": "<med>", "dosage": "<dose>", "frequency": "<freq>", "prescriber": "<dr>", "indication": "<indication>"}],
  "vitals": [{"label": "<label>", "value": "<value>", "unit": "<unit>", "status": "normal|warning|critical"}],
  "conditions": ["<condition 1>", ...],
  "labResults": [{"test": "<test>", "value": "<value>", "range": "<range>", "status": "normal|high|low", "date": "<date>"}],
  "primaryComplaint": "<chief complaint>",
  "surgicalHistory": ["<surgery 1>", ...],
  "familyHistory": ["<history 1>", ...],
  "socialHistory": [{"label": "<label>", "value": "<value>"}],
  "immunizations": [{"name": "<vaccine>", "date": "<date>"}],
  "hospitalRouting": {"facility": "<facility>", "reason": "<reason>", "distance": "<distance>"}
}

Return ONLY the JSON object, no markdown or explanation.`;

  try {
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
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (raw) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        callData.patientDocument = JSON.parse(jsonMatch[0]);
      }
    }
  } catch {
    // Patient document generation failed
  }
}

export async function POST() {
  callData.status = "processing";
  callData.processingSteps = [
    { id: "phone", label: "Detecting caller phone number", status: "pending", detail: null },
    { id: "transcript", label: "Analyzing call transcript", status: "pending", detail: null },
    { id: "lookup", label: "Looking up patient in records", status: "pending", detail: null },
    { id: "memv", label: "Pulling patient history from Mem[v]", status: "pending", detail: null },
    { id: "summary", label: "Generating call summary", status: "pending", detail: null },
    { id: "document", label: "Generating patient document", status: "pending", detail: null },
    { id: "orchestrate", label: "Launching multi-agent orchestration", status: "pending", detail: null },
  ];

  try {
    // Step 1: Phone number
    setStep("phone", "active");
    await sleep(400);

    const phone = callData.callerPhone;
    if (phone) {
      setStep("phone", "done", `Caller: ${phone}`);
    } else {
      setStep("phone", "done", "No caller ID available — using transcript");
    }

    // Step 2: Analyze transcript
    setStep("transcript", "active");
    await sleep(300);

    const fullTranscript = callData.transcript
      .map((t) => `${t.role}: ${t.text}`)
      .join("\n");

    const extractedName = callData.extracted.name;
    setStep("transcript", "done",
      `${callData.transcript.length} lines captured` +
      (extractedName ? ` — Patient: ${extractedName}` : "")
    );

    // Step 3: Look up patient
    setStep("lookup", "active");
    await sleep(300);

    let patientFound = false;
    let patientName = extractedName || "";
    let patientLocation = callData.extracted.location || "";
    let patientIssue = callData.extracted.situation || "";
    let patientId = "";
    let patientPhone = phone || "";

    if (phone) {
      const result = lookupByPhone(phone);
      if (result.indexEntry) {
        patientFound = true;
        patientName = result.indexEntry.name;
        patientId = result.indexEntry.patient_id;
        patientLocation = result.indexEntry.location;
        if (result.patientData) {
          patientIssue = result.patientData.health_issue;
        }
      }
    }

    if (!patientFound && extractedName) {
      const result = lookupByName(extractedName);
      if (result.indexEntry) {
        patientFound = true;
        patientName = result.indexEntry.name;
        patientId = result.indexEntry.patient_id;
        patientLocation = result.indexEntry.location;
        patientPhone = result.phone || patientPhone;
        if (result.patientData) {
          patientIssue = result.patientData.health_issue;
        }
      }
    }

    if (patientFound) {
      setStep("lookup", "done", `Found: ${patientName} (${patientLocation})`);
    } else {
      setStep("lookup", "done", `New patient: ${patientName || "Unknown"}`);
    }

    // Step 4: Query Mem[v] for history
    setStep("memv", "active");
    let memories: string[] = [];

    if (patientName) {
      memories = await queryMemvAI(patientName);
    }

    if (memories.length > 0) {
      setStep("memv", "done", `${memories.length} memories retrieved`);
    } else {
      setStep("memv", "done", "No prior memories found");
      if (patientIssue) {
        memories = [`${patientName} reporting: ${patientIssue}`];
      }
    }

    // Save patient record
    callData.patient = {
      patient_id: patientId || `PAT-${Date.now()}`,
      name: patientName,
      phone: patientPhone,
      location: patientLocation,
      health_issue: patientIssue,
      retrieved_memories: memories,
      primary_complaint: patientIssue || callData.extracted.situation,
    };

    // Step 5: Generate structured clinical note (summary) with Perplexity (or fallback to Gemini)
    setStep("summary", "active");

    const summaryPrompt = `You are an AI clinical documentation assistant. You are generating a fully structured clinical note from a healthcare intake call. Use ALL available context.

CALLER: ${patientName || "Unknown"}
PHONE: ${patientPhone || "Unknown"}
LOCATION: ${patientLocation || "Unknown"}

PATIENT HISTORY FROM MEM[V]:
${memories.length > 0 ? memories.join("\n") : "No prior records found."}

CALL TRANSCRIPT:
${fullTranscript}

EXTRACTED INFO:
- Situation: ${callData.extracted.situation || "N/A"}
- Urgency: ${callData.extracted.urgency || "N/A"}
- Medical Notes: ${callData.extracted.medicalNotes || "N/A"}
- Action Needed: ${callData.extracted.actionNeeded || "N/A"}

Write a comprehensive clinical note covering:
1. Patient Identification and Contact Information
2. Chief Complaint (Presenting symptoms, onset, and severity)
3. Relevant Medical History (From prior Mem[v] records)
4. Clinical Observations and Urgency Level
5. Recommended Action and Care Plan (including specialist referrals or facility routing)

Be concise, clinical, and professional. Write in structured plain text (no markdown formatting).`;

    if (fullTranscript) {
      try {
        if (PERPLEXITY_KEY) {
          callData.summary = await callPerplexity(summaryPrompt);
        } else if (GEMINI_KEY) {
          const summaryRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: summaryPrompt }] }],
              }),
            }
          );
          const summaryData = await summaryRes.json();
          callData.summary =
            summaryData.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Summary generation failed.";
        } else {
          callData.summary = "Clinical note generation failed: no key configured.";
        }
      } catch {
        callData.summary = "Clinical note generation failed.";
      }
    } else if (!callData.summary) {
      callData.summary = `Patient: ${patientName}\nLocation: ${patientLocation}\nComplaint: ${patientIssue}\nUrgency: ${callData.extracted.urgency || "Unknown"}`;
    }

    setStep("summary", "done", PERPLEXITY_KEY ? "Clinical note generated using Perplexity" : "Clinical note generated using Gemini");

    // Step 6: Generate patient document with Gemini
    setStep("document", "active");
    await generatePatientDocument();
    setStep("document", "done", callData.patientDocument ? "Patient document generated" : "Document generation skipped");

    // Step 7: Launch orchestration in background
    setStep("orchestrate", "active");
    triggerOrchestration(); // Fire and forget
    setStep("orchestrate", "done", "15-agent orchestration launched");

    callData.status = "complete";

    return NextResponse.json({ success: true, patient: callData.patient });
  } catch (err) {
    callData.status = "complete";
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
