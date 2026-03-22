import { NextRequest, NextResponse } from "next/server";
import { callStore } from "@/lib/callStore";

export async function POST(req: NextRequest) {
  const { script, patientId } = await req.json();

  const callId = `call-${Date.now()}`;

  // Initialize the call in our in-memory store
  callStore.set(callId, {
    status: "connecting",
    transcript: [],
    complete: false,
    lastIndex: 0,
  });

  if (!process.env.VAPI_API_KEY) {
    // Mock: simulate a call with delayed transcript updates
    simulateMockCall(callId);
    return NextResponse.json({ success: true, callId, mock: true });
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
  } catch {
    // Fall back to mock
    simulateMockCall(callId);
    return NextResponse.json({ success: true, callId, mock: true });
  }
}

function simulateMockCall(callId: string) {
  const call = callStore.get(callId);
  if (!call) return;

  const events = [
    { delay: 1000, status: "ringing", line: "" },
    { delay: 3000, status: "connected", line: "[00:00] Navigator AI: Hello, my name is Navigator AI and I'm calling on behalf of patient Maria Santos, member ID BCX-449281, regarding a prior authorization request for Ozempic." },
    { delay: 6000, status: "connected", line: "[00:15] Agent: Thank you for calling Blue Cross Prior Authorization. My name is Karen. How can I help you today?" },
    { delay: 9000, status: "speaking", line: "[00:22] Navigator AI: Thank you, Karen. I'm calling to request prior authorization for Ozempic, semaglutide injection, for our patient. The member ID is BCX-449281 and date of birth is March 15, 1972." },
    { delay: 13000, status: "speaking", line: "[00:45] Agent: Let me pull up that member's account... I see the member. And you said this is for Ozempic?" },
    { delay: 16000, status: "speaking", line: "[01:02] Navigator AI: That's correct. The patient has documented Type 2 diabetes with an A1C of 8.2 despite maximum-dose metformin therapy for over 6 months. Per ADA Standards of Care, GLP-1 receptor agonists are recommended as second-line therapy." },
    { delay: 20000, status: "speaking", line: "[01:30] Agent: I can see the clinical documentation that was submitted. Let me review the criteria..." },
    { delay: 25000, status: "on-hold", line: "[02:00] Agent: I'm going to place you on a brief hold while I review this with our clinical team." },
    { delay: 32000, status: "speaking", line: "[02:45] Agent: Thank you for holding. I've reviewed the documentation and the patient does meet our clinical criteria for Ozempic." },
    { delay: 36000, status: "speaking", line: "[03:10] Agent: I'm going to approve this authorization for a 6-month period. The authorization number is PA-2024-ZQ4819." },
    { delay: 40000, status: "speaking", line: "[03:30] Navigator AI: Thank you, Karen. To confirm — the reference number is PA-2024-ZQ4819, the authorization is for 6 months, and the prescription can be filled immediately at any in-network pharmacy?" },
    { delay: 44000, status: "speaking", line: "[03:45] Agent: That's correct. The authorization is effective immediately. Is there anything else I can help with?" },
    { delay: 47000, status: "speaking", line: "[04:00] Navigator AI: No, that's everything. Thank you very much for your help today, Karen. Goodbye." },
    { delay: 49000, status: "ended", line: "[04:05] Call ended." },
  ];

  events.forEach(({ delay, status, line }) => {
    setTimeout(() => {
      const c = callStore.get(callId);
      if (!c) return;
      c.status = status;
      if (line) c.transcript.push(line);
      if (status === "ended") c.complete = true;
    }, delay);
  });
}
