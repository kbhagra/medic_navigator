import { NextRequest, NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";

async function extractInfo(fullTranscript: string) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) return;

  try {
    const extractRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract patient intake information from this call transcript.
Return ONLY a JSON object with these exact keys. Use null for anything not yet mentioned.

Transcript:
${fullTranscript}

Return this JSON and nothing else:
{
  "name": "patient full name or null",
  "location": "their location as stated or null",
  "situation": "what happened / chief complaint or null",
  "urgency": "Low or Medium or High or null",
  "medicalNotes": "medications, allergies, conditions mentioned or null",
  "actionNeeded": "what they need Navigator to do or null"
}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const extractData = await extractRes.json();
    const raw =
      extractData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const keys = Object.keys(parsed) as Array<keyof typeof callData.extracted>;
    for (const key of keys) {
      if (parsed[key] !== null && parsed[key] !== "null" && key in callData.extracted) {
        (callData.extracted as Record<string, unknown>)[key] = parsed[key];
      }
    }
  } catch {
    // Extraction failed silently
  }
}

async function generateSummary(fullTranscript: string) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    callData.summary = "Call ended. No Gemini key configured for summary.";
    return;
  }

  try {
    const summaryRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are summarizing a healthcare phone call made by an AI agent on a patient's behalf.

Transcript:
${fullTranscript}

Write a clear summary covering:
- What the call was about
- What was accomplished or resolved
- Any reference numbers or confirmation details mentioned
- Next steps or follow-up actions required
- Overall outcome (resolved / pending / denied / escalated)

Be concise. Plain text, no markdown.`,
                },
              ],
            },
          ],
        }),
      }
    );
    const summaryData = await summaryRes.json();
    callData.summary =
      summaryData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Summary unavailable.";
  } catch {
    callData.summary = "Summary generation failed.";
  }
}

// Try to extract caller phone from any Vapi event
function extractCallerPhone(event: Record<string, unknown>) {
  // Vapi puts caller info in various places depending on event type
  const call = event.call as Record<string, unknown> | undefined;
  if (call) {
    const customer = call.customer as Record<string, string> | undefined;
    if (customer?.number) {
      callData.callerPhone = customer.number;
    }
    // Also check phoneNumber field
    if (call.phoneNumber && typeof call.phoneNumber === 'object') {
      const pn = call.phoneNumber as Record<string, string>;
      if (pn.number) callData.callerPhone = pn.number;
    }
  }
  // Direct customer field
  const customer = event.customer as Record<string, string> | undefined;
  if (customer?.number) {
    callData.callerPhone = customer.number;
  }
}

// Extract transcript text from various Vapi event formats
function getTranscriptText(event: Record<string, unknown>): { role: "user" | "assistant"; text: string } | null {
  // Format 1: event.transcript is a string
  if (typeof event.transcript === "string" && event.transcript) {
    return {
      role: event.role === "assistant" ? "assistant" : "user",
      text: event.transcript,
    };
  }
  // Format 2: event.transcript is an object with text
  if (event.transcript && typeof event.transcript === "object") {
    const t = event.transcript as Record<string, string>;
    if (t.text) {
      return {
        role: (t.role === "assistant" ? "assistant" : "user"),
        text: t.text,
      };
    }
  }
  // Format 3: direct text field
  if (typeof event.text === "string" && event.text) {
    return {
      role: event.role === "assistant" ? "assistant" : "user",
      text: event.text,
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Vapi can wrap events in "message"
  const event = (body.message || body) as Record<string, unknown>;
  const type = event.type as string;

  // Log raw event for debugging (keep last 50)
  callData.rawEvents.push({ type, payload: event, timestamp: Date.now() });
  if (callData.rawEvents.length > 50) callData.rawEvents.shift();

  // Try to grab caller phone from any event
  extractCallerPhone(event);

  // Also grab callId
  const call = event.call as Record<string, unknown> | undefined;
  if (call?.id && typeof call.id === "string") {
    callData.callId = call.id;
  }

  if (type === "transcript") {
    const parsed = getTranscriptText(event);
    if (parsed && parsed.text) {
      callData.transcript.push({
        role: parsed.role,
        text: parsed.text,
        timestamp: Date.now(),
      });
      callData.status = "active";

      const fullTranscript = callData.transcript
        .map((t) => `${t.role}: ${t.text}`)
        .join("\n");

      extractInfo(fullTranscript);
    }
  }

  if (type === "conversation-update") {
    const convo = event.conversation;
    if (Array.isArray(convo)) {
      callData.transcript = convo
        .filter(
          (m: { role: string; content?: string }) =>
            (m.role === "user" || m.role === "assistant") && m.content
        )
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          text: m.content,
          timestamp: Date.now(),
        }));
      callData.status = "active";

      const fullTranscript = callData.transcript
        .map((t) => `${t.role}: ${t.text}`)
        .join("\n");

      if (fullTranscript) extractInfo(fullTranscript);
    }
  }

  if (type === "speech-update" || type === "status-update") {
    callData.status = "active";
  }

  if (type === "end-of-call-report" || type === "call-ended") {
    callData.status = "ended";

    // Grab transcript from artifact if available
    if (event.artifact && typeof event.artifact === "object") {
      const artifact = event.artifact as Record<string, unknown>;
      if (Array.isArray(artifact.messages)) {
        const msgs = artifact.messages
          .filter(
            (m: { role: string; content?: string; message?: string }) =>
              (m.role === "user" || m.role === "assistant") && (m.content || m.message)
          )
          .map((m: { role: string; content?: string; message?: string }) => ({
            role: m.role as "user" | "assistant",
            text: (m.content || m.message || "") as string,
            timestamp: Date.now(),
          }));
        if (msgs.length > 0) callData.transcript = msgs;
      }
    }

    // Don't generate summary here — let /api/process handle it with full Mem[v] context
    // Just do a final extraction
    const fullTranscript = callData.transcript
      .map((t) => `${t.role}: ${t.text}`)
      .join("\n");

    if (fullTranscript) {
      await extractInfo(fullTranscript);
    }

    // Auto-trigger the processing pipeline
    const baseUrl = req.headers.get("x-forwarded-proto") === "https"
      ? `https://${req.headers.get("host")}`
      : `http://${req.headers.get("host") || "localhost:3000"}`;

    fetch(`${baseUrl}/api/process`, { method: "POST" }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
