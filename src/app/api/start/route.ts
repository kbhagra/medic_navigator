import { NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";

export async function POST() {
  try {
    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        assistantId: process.env.VAPI_ASSISTANT_ID,
        customer: {
          number: "+16693105333",
        },
      }),
    });

    const call = await response.json();

    if (call.error || !call.id) {
      return NextResponse.json(
        { error: call.error || "Failed to initiate call", detail: JSON.stringify(call) },
        { status: 500 }
      );
    }

    callData.status = "active";
    callData.callId = call.id;

    return NextResponse.json({ callId: call.id, status: "initiated" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to initiate call", detail: String(err) },
      { status: 500 }
    );
  }
}
