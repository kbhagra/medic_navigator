export type PatientProfile = {
  id: string;
  name: string;
  dob: string;
  insurance: {
    provider: string;
    planName: string;
    memberId: string;
    groupNumber?: string;
  };
  primaryDoctor: {
    name: string;
    phone: string;
    npi?: string;
  };
  conditions: string[];
  medications: string[];
  email: string;
  callHistory: CallRecord[];
};

export type CallRecord = {
  id: string;
  taskDescription: string;
  researchSummary: string;
  script: string;
  transcript: string;
  outcome: "approved" | "denied" | "pending" | "escalated" | "follow-up";
  outcomeDetail: string;
  referenceNumber?: string;
  nextAction?: string;
  nextActionDate?: string;
  duration: number;
  timestamp: string;
  apisUsed: string[];
};

export type ResearchResult = {
  insuranceRules: string;
  contactInfo: {
    department: string;
    phone: string;
    hours: string;
  };
  requiredInfo: string[];
  bestArguments: string[];
  commonDenialReasons: string[];
  overrideStrategies: string[];
  estimatedSuccessRate: number;
};

export type CallScript = {
  targetPhone: string;
  opening: string;
  keyInfo: string[];
  primaryArgument: string;
  objectionHandlers: Record<string, string>;
  escalationTrigger: string;
  closing: string;
  estimatedDuration: string;
  fullScript: string;
};

export type CallOutcome = {
  status: "approved" | "denied" | "pending" | "escalated" | "follow-up";
  referenceNumber: string;
  summary: string;
  nextAction: string;
  nextActionDate: string;
  transcript: string;
};

export type Hospital = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  waitTimeMinutes: number;
  availableBeds: number;
  totalBeds: number;
  specialties: string[];
  isTrauma: boolean;
  isPediatric: boolean;
  capacityPct: number;
};
