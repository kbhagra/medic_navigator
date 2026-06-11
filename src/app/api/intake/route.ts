import { NextRequest, NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, location, situation, urgency, medicalNotes, actionNeeded } = body;

    // Reset callData
    callData.transcript.length = 0;
    callData.summary = null;
    callData.status = "idle";
    callData.callId = null;
    callData.callerPhone = phone || null;
    callData.extracted.name = name || null;
    callData.extracted.location = location || null;
    callData.extracted.situation = situation || null;
    callData.extracted.urgency = urgency || null;
    callData.extracted.medicalNotes = medicalNotes || null;
    callData.extracted.actionNeeded = actionNeeded || null;
    callData.patient = null;
    callData.processingSteps.length = 0;
    callData.rawEvents.length = 0;
    callData.agentResults.length = 0;
    callData.diagnosisSummary = null;
    callData.orchestrationStatus = "idle";
    callData.orchestrationProgress = 0;
    callData.procedures.length = 0;
    callData.causes.length = 0;
    callData.patientDocument = null;

    // Populate a structured intake transcript
    callData.transcript = [
      {
        role: "assistant",
        text: "Hello, this is the MOCHA AI intake system. Please state your name, location, and the reason for your visit.",
        timestamp: Date.now() - 10000,
      },
      {
        role: "user",
        text: `My name is ${name || "Unknown"}. I am currently at ${location || "Unknown"}. I am presenting with ${situation || "unspecified symptoms"}.`,
        timestamp: Date.now() - 8000,
      },
      {
        role: "assistant",
        text: "Thank you. Do you have any known medical conditions, allergies, or active medications?",
        timestamp: Date.now() - 5000,
      },
      {
        role: "user",
        text: medicalNotes ? `Yes, here are the notes: ${medicalNotes}` : "No major conditions or medications that I am aware of.",
        timestamp: Date.now() - 3000,
      }
    ];

    callData.status = "ended";

    // Trigger process route
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    fetch(`${baseUrl}/api/process`, { method: "POST" }).catch(() => {});

    return NextResponse.json({ success: true, message: "Intake registered, processing started." });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
