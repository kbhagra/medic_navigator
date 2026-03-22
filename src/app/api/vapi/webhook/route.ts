import { NextRequest, NextResponse } from "next/server";
import { callStore } from "@/lib/callStore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, callId, transcript, status } = body;

  const call = callStore.get(callId);

  if (type === "transcript" && call) {
    call.transcript.push(transcript);
  }

  if (type === "status-update" && call) {
    call.status = status;
  }

  if (type === "call-ended" && call) {
    call.complete = true;
    call.status = "ended";
  }

  return NextResponse.json({ received: true });
}
