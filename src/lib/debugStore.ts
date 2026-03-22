// Use globalThis to persist across hot reloads in dev
type ProcessingStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail: string | null;
};

type PatientRecord = {
  patient_id: string;
  name: string;
  phone: string;
  location: string;
  health_issue: string;
  retrieved_memories: string[];
  primary_complaint: string | null;
};

type CallData = {
  transcript: Array<{ role: "user" | "assistant"; text: string; timestamp: number }>;
  summary: string | null;
  status: "idle" | "active" | "ended" | "processing" | "complete";
  callId: string | null;
  callerPhone: string | null;
  extracted: {
    name: string | null;
    location: string | null;
    situation: string | null;
    urgency: "Low" | "Medium" | "High" | null;
    medicalNotes: string | null;
    actionNeeded: string | null;
  };
  patient: PatientRecord | null;
  processingSteps: ProcessingStep[];
  rawEvents: Array<{ type: string; payload: unknown; timestamp: number }>;
};

const defaultCallData: CallData = {
  transcript: [],
  summary: null,
  status: "idle",
  callId: null,
  callerPhone: null,
  extracted: {
    name: null,
    location: null,
    situation: null,
    urgency: null,
    medicalNotes: null,
    actionNeeded: null,
  },
  patient: null,
  processingSteps: [],
  rawEvents: [],
};

const globalForStore = globalThis as unknown as { __callData?: CallData };

if (!globalForStore.__callData) {
  globalForStore.__callData = {
    ...defaultCallData,
    extracted: { ...defaultCallData.extracted },
    rawEvents: [],
    processingSteps: [],
  };
}

export const callData: CallData = globalForStore.__callData;
export type { CallData, ProcessingStep, PatientRecord };
