import { NextRequest, NextResponse } from "next/server";
import { callStore } from "@/lib/callStore";

export async function POST(req: NextRequest) {
  const { script, patientId } = await req.json();

  const callId = `call-${Date.now()}`;

  callStore.set(callId, {
    status: "connecting",
    transcript: [],
    complete: false,
    lastIndex: 0,
  });

  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: "VAPI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: { number: script.targetPhone },
        assistant: {
          model: {
            provider: "anthropic",
            model: "claude-sonnet-4-20250514",
            systemPrompt: script.fullScript,
          },
          voice: {
            provider: "elevenlabs",
            voiceId: process.env.ELEVENLABS_VOICE_ID,
          },
        },
        metadata: { patientId, callId },
      }),
    });

    const data = await response.json();
    return NextResponse.json({
      success: true,
      callId,
      vapiCallId: data.id,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
