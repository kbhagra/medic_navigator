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

type AgentResult = {
  id: string;
  name: string;
  model: string;
  wave: number;
  type: string;
  confidence: number;
  finding: string;
  details: string[];
  duration: number;
  status: "pending" | "running" | "complete" | "error";
};

type DiagnosisSummary = {
  primary: string;
  confidence: number;
  riskLevel: string;
  differentials: { diagnosis: string; probability: number; status: string }[];
  treatments: { action: string; priority: string; timeframe: string }[];
  referrals: { specialty: string; urgency: string; timeframe: string }[];
  agentCount: number;
  modelsUsed: string[];
  totalDuration: number;
} | null;

type Procedure = {
  title: string;
  source: string;
  desc: string;
  details: string[];
};

type Cause = {
  title: string;
  items: string[];
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
  // Orchestration fields
  agentResults: AgentResult[];
  diagnosisSummary: DiagnosisSummary;
  orchestrationStatus: "idle" | "running" | "complete" | "error";
  orchestrationProgress: number;
  procedures: Procedure[];
  causes: Cause[];
  patientDocument: Record<string, unknown> | null;
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
  agentResults: [],
  diagnosisSummary: null,
  orchestrationStatus: "idle",
  orchestrationProgress: 0,
  procedures: [],
  causes: [],
  patientDocument: null,
};

const globalForStore = globalThis as unknown as { __callData?: CallData };

if (!globalForStore.__callData) {
  globalForStore.__callData = { ...defaultCallData, extracted: { ...defaultCallData.extracted }, rawEvents: [], processingSteps: [], agentResults: [], procedures: [], causes: [] };
}

// Ensure existing store has new fields (hot reload compat)
const store = globalForStore.__callData;
if (!store.agentResults) store.agentResults = [];
if (!store.diagnosisSummary) store.diagnosisSummary = null;
if (!store.orchestrationStatus) store.orchestrationStatus = "idle";
if (store.orchestrationProgress === undefined) store.orchestrationProgress = 0;
if (!store.procedures) store.procedures = [];
if (!store.causes) store.causes = [];
if (store.patientDocument === undefined) store.patientDocument = null;

export const callData: CallData = store;
export type { CallData, ProcessingStep, PatientRecord, AgentResult, DiagnosisSummary, Procedure, Cause };
