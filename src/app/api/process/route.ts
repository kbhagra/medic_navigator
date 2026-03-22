import { NextResponse } from "next/server";
import { callData } from "@/lib/debugStore";
import { lookupByPhone, lookupByName, queryMemvAI } from "@/lib/memvLookup";

function setStep(id: string, status: "active" | "done" | "error", detail?: string) {
  const step = callData.processingSteps.find((s) => s.id === id);
  if (step) {
    step.status = status;
    if (detail !== undefined) step.detail = detail;
  }
}

export async function POST() {
  // Initialize processing steps
  callData.status = "processing";
  callData.processingSteps = [
    { id: "phone", label: "Detecting caller phone number", status: "pending", detail: null },
    { id: "transcript", label: "Analyzing call transcript", status: "pending", detail: null },
    { id: "lookup", label: "Looking up patient in records", status: "pending", detail: null },
    { id: "memv", label: "Pulling patient history from Mem[v]", status: "pending", detail: null },
    { id: "summary", label: "Generating call summary", status: "pending", detail: null },
    { id: "dashboard", label: "Updating dashboard with live data", status: "pending", detail: null },
  ];

  try {
    // Step 1: Phone number
    setStep("phone", "active");
    await sleep(600);

    const phone = callData.callerPhone;
    if (phone) {
      setStep("phone", "done", `Caller: ${phone}`);
    } else {
      setStep("phone", "done", "No caller ID available — using transcript");
    }

    // Step 2: Analyze transcript
    setStep("transcript", "active");
    await sleep(400);

    const fullTranscript = callData.transcript
      .map((t) => `${t.role}: ${t.text}`)
      .join("\n");

    const extractedName = callData.extracted.name;
    setStep("transcript", "done",
      `${callData.transcript.length} lines captured` +
      (extractedName ? ` — Patient: ${extractedName}` : "")
    );

    // Step 3: Look up patient
    setStep("lookup", "active");
    await sleep(500);

    let patientFound = false;
    let patientName = extractedName || "";
    let patientLocation = callData.extracted.location || "";
    let patientIssue = callData.extracted.situation || "";
    let patientId = "";
    let patientPhone = phone || "";

    // Try phone lookup first
    if (phone) {
      const result = lookupByPhone(phone);
      if (result.indexEntry) {
        patientFound = true;
        patientName = result.indexEntry.name;
        patientId = result.indexEntry.patient_id;
        patientLocation = result.indexEntry.location;
        if (result.patientData) {
          patientIssue = result.patientData.health_issue;
        }
      }
    }

    // Try name lookup if phone didn't work
    if (!patientFound && extractedName) {
      const result = lookupByName(extractedName);
      if (result.indexEntry) {
        patientFound = true;
        patientName = result.indexEntry.name;
        patientId = result.indexEntry.patient_id;
        patientLocation = result.indexEntry.location;
        patientPhone = result.phone || patientPhone;
        if (result.patientData) {
          patientIssue = result.patientData.health_issue;
        }
      }
    }

    if (patientFound) {
      setStep("lookup", "done", `Found: ${patientName} (${patientLocation})`);
    } else {
      setStep("lookup", "done", `New patient: ${patientName || "Unknown"}`);
    }

    // Step 4: Query Mem[v] for history
    setStep("memv", "active");
    let memories: string[] = [];

    if (patientName) {
      memories = await queryMemvAI(patientName);
    }

    if (memories.length > 0) {
      setStep("memv", "done", `${memories.length} memories retrieved`);
    } else {
      // Use local data as fallback
      setStep("memv", "done", "Using local patient records");
      if (patientIssue) {
        memories = [`${patientName} reporting: ${patientIssue}`];
      }
    }

    // Save patient record
    callData.patient = {
      patient_id: patientId || `PAT-${Date.now()}`,
      name: patientName,
      phone: patientPhone,
      location: patientLocation,
      health_issue: patientIssue,
      retrieved_memories: memories,
      primary_complaint: patientIssue || callData.extracted.situation,
    };

    // Step 5: Generate summary with full context
    setStep("summary", "active");

    if (process.env.GOOGLE_GEMINI_API_KEY && fullTranscript) {
      try {
        const summaryRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are summarizing a healthcare intake call. Use ALL available context.

CALLER: ${patientName || "Unknown"}
PHONE: ${patientPhone || "Unknown"}
LOCATION: ${patientLocation || "Unknown"}

PATIENT HISTORY FROM MEM[V]:
${memories.length > 0 ? memories.join("\n") : "No prior records found."}

CALL TRANSCRIPT:
${fullTranscript}

EXTRACTED INFO:
- Situation: ${callData.extracted.situation || "N/A"}
- Urgency: ${callData.extracted.urgency || "N/A"}
- Medical Notes: ${callData.extracted.medicalNotes || "N/A"}
- Action Needed: ${callData.extracted.actionNeeded || "N/A"}

Write a comprehensive clinical summary covering:
1. Patient identification and contact info
2. Chief complaint and current symptoms
3. Relevant medical history (from Mem[v] records)
4. Urgency assessment
5. Recommended next steps / routing decision
6. Any follow-up actions needed

Be concise and clinical. Plain text, no markdown.`,
                }],
              }],
            }),
          }
        );
        const summaryData = await summaryRes.json();
        callData.summary =
          summaryData.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Summary generation failed.";
      } catch {
        callData.summary = "Summary generation failed.";
      }
    } else if (!callData.summary) {
      callData.summary = `Patient: ${patientName}\nLocation: ${patientLocation}\nComplaint: ${patientIssue}\nUrgency: ${callData.extracted.urgency || "Unknown"}`;
    }

    setStep("summary", "done", "Summary generated");

    // Step 6: Dashboard update
    setStep("dashboard", "active");
    await sleep(400);
    setStep("dashboard", "done", "Dashboard updated with call data");

    callData.status = "complete";

    return NextResponse.json({ success: true, patient: callData.patient });
  } catch (err) {
    callData.status = "complete";
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
