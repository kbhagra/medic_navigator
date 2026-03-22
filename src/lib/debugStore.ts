// Use globalThis to persist across hot reloads in dev
type CallData = {
  transcript: Array<{ role: "user" | "assistant"; text: string; timestamp: number }>;
  summary: string | null;
  status: "idle" | "active" | "ended";
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
  rawEvents: [],
};

const globalForStore = globalThis as unknown as { __callData?: CallData };

if (!globalForStore.__callData) {
  globalForStore.__callData = { ...defaultCallData, extracted: { ...defaultCallData.extracted }, rawEvents: [] };
}

export const callData: CallData = globalForStore.__callData;
