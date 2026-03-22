import { NextRequest, NextResponse } from "next/server";
import { MOCK_SCRIPT } from "@/lib/mockData";

export async function POST(req: NextRequest) {
  const { task, research, profile } = await req.json();

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json(MOCK_SCRIPT);
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genai = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are writing a script for an AI voice agent calling a healthcare provider on behalf of a patient.

Patient: ${profile.name}, DOB: ${profile.dob}
Insurance: ${profile.insurance.provider}, Member ID: ${profile.insurance.memberId}
Task: ${task}
Research: ${JSON.stringify(research)}

Write a complete call script. Return JSON:
{
  "targetPhone": "the number to call from research",
  "opening": "exact words to say when someone picks up",
  "keyInfo": ["member ID", "DOB", "claim number if applicable"],
  "primaryArgument": "the single strongest case for the patient",
  "objectionHandlers": { "objection phrase": "response", ... },
  "escalationTrigger": "when to ask for a supervisor",
  "closing": "what to confirm before hanging up",
  "estimatedDuration": "3-5 minutes",
  "fullScript": "the complete word-for-word script"
}

Return only valid JSON, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return NextResponse.json(JSON.parse(jsonMatch[0]));
      }
      return NextResponse.json(MOCK_SCRIPT);
    }
  } catch {
    return NextResponse.json(MOCK_SCRIPT);
  }
}
