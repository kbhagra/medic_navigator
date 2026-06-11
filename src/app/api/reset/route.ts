import { NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";

export async function POST() {
  callData.transcript.length = 0;
  callData.summary = null;
  callData.status = "idle";
  callData.callId = null;
  callData.callerPhone = null;
  callData.extracted.name = null;
  callData.extracted.location = null;
  callData.extracted.situation = null;
  callData.extracted.urgency = null;
  callData.extracted.medicalNotes = null;
  callData.extracted.actionNeeded = null;
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
  return NextResponse.json({ ok: true });
}
