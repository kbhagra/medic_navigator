import { NextRequest } from "next/server";
import { callStore } from "@/lib/callStore";

export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("callId");

  if (!callId) {
    return new Response("Missing callId", { status: 400 });
  }

  let sentIndex = 0;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const interval = setInterval(() => {
        const call = callStore.get(callId);
        if (!call) return;

        // Send status updates
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "status", status: call.status })}\n\n`)
        );

        // Send new transcript lines
        while (sentIndex < call.transcript.length) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "transcript", line: call.transcript[sentIndex] })}\n\n`
            )
          );
          sentIndex++;
        }

        if (call.complete) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`)
          );
          controller.close();
          clearInterval(interval);
        }
      }, 500);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
