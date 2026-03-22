import { NextRequest, NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("raw");
  if (raw === "1") {
    return NextResponse.json({ rawEvents: callData.rawEvents });
  }
  return NextResponse.json({
    transcript: callData.transcript,
    summary: callData.summary,
    status: callData.status,
    callId: callData.callId,
    callerPhone: callData.callerPhone,
    extracted: callData.extracted,
  });
}
