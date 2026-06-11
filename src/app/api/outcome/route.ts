import { NextRequest, NextResponse } from "next/server";
import { callStore } from "@/lib/callStore";

export async function POST(req: NextRequest) {
  const { callId, task, patientProfile } = await req.json();

  const call = callStore.get(callId);
  const transcript = call?.transcript.join("\n") || "";

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genai = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this healthcare call transcript and generate an outcome summary.

Task: ${task}
Patient: ${patientProfile?.name || "Unknown"}
Transcript:
${transcript}

Return JSON:
{
  "status": "approved" | "denied" | "pending" | "escalated" | "follow-up",
  "referenceNumber": "extracted from transcript or generated",
  "summary": "one paragraph summary of what happened",
  "nextAction": "what the patient should do next",
  "nextActionDate": "when to follow up"
}

Return only valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ ...parsed, transcript });
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ ...parsed, transcript });
      }
      return NextResponse.json({ error: "Failed to parse outcome response" }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
