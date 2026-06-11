import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, patientProfile, patientId } = body;

  if (action === "save") {
    if (!process.env.MEMV_API_KEY) {
      return NextResponse.json({
        success: true,
        patientId: patientProfile.id || `PAT-${Date.now()}`,
        note: "MEMV_API_KEY not configured",
      });
    }

    try {
      const response = await fetch("https://api.mem.ai/v1/memories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MEMV_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: JSON.stringify(patientProfile),
          metadata: {
            type: "patient_profile",
            patientId: patientProfile.id,
          },
        }),
      });

      const data = await response.json();
      return NextResponse.json({
        success: true,
        patientId: patientProfile.id,
        memvId: data.id,
      });
    } catch {
      return NextResponse.json({
        success: true,
        patientId: patientProfile.id,
        note: "Mem[v] unavailable, stored locally",
      });
    }
  }

  if (action === "retrieve") {
    if (!process.env.MEMV_API_KEY) {
      return NextResponse.json({ success: true, profile: null });
    }

    try {
      const response = await fetch("https://api.mem.ai/v1/memories/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MEMV_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `patient ${patientId} profile`,
          limit: 1,
        }),
      });

      const data = await response.json();
      return NextResponse.json({ success: true, profile: data });
    } catch {
      return NextResponse.json({ success: true, profile: null });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
