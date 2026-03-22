import { ResearchResult, CallScript, CallOutcome } from "@/types";

export const MOCK_RESEARCH: ResearchResult = {
  insuranceRules:
    "Blue Cross PPO plans require prior authorization for GLP-1 receptor agonists including Ozempic. The patient must have a documented BMI ≥30 or BMI ≥27 with at least one weight-related comorbidity, OR a diagnosis of Type 2 diabetes. A step therapy requirement may apply — the patient may need to have tried metformin first.",
  contactInfo: {
    department: "Blue Cross Prior Authorization Department",
    phone: "(800) 451-0287",
    hours: "Monday-Friday, 8:00 AM - 6:00 PM EST",
  },
  requiredInfo: [
    "Member ID number",
    "Patient date of birth",
    "Prescribing physician NPI",
    "Diagnosis code (E11.9 for Type 2 Diabetes)",
    "Previous medications tried",
    "Most recent A1C lab results",
  ],
  bestArguments: [
    "Patient has documented Type 2 diabetes with A1C above target despite metformin therapy",
    "Ozempic has FDA approval for glycemic control and cardiovascular risk reduction",
    "The ADA Standards of Care recommend GLP-1 RA as second-line therapy after metformin",
  ],
  commonDenialReasons: [
    "Step therapy not completed — patient hasn't tried preferred alternatives",
    "Missing clinical documentation — lab results or diagnosis codes not submitted",
  ],
  overrideStrategies: [
    "Request a peer-to-peer review with the medical director",
    "Submit an appeal citing ADA guidelines and patient-specific contraindications to alternatives",
  ],
  estimatedSuccessRate: 0.72,
};

export const MOCK_SCRIPT: CallScript = {
  targetPhone: "(800) 451-0287",
  opening:
    "Hello, my name is Navigator AI and I'm calling on behalf of patient Maria Santos, member ID BCX-449281, regarding a prior authorization request for Ozempic, semaglutide injection. I'd like to speak with someone in your prior authorization department please.",
  keyInfo: [
    "Member ID: BCX-449281",
    "DOB: 03/15/1972",
    "Prescribing physician: Dr. James Chen, NPI 1234567890",
    "Diagnosis: Type 2 Diabetes (E11.9)",
  ],
  primaryArgument:
    "The patient has documented Type 2 diabetes with an A1C of 8.2 despite maximum-dose metformin therapy for over 6 months. Per ADA Standards of Care 2024, GLP-1 receptor agonists are recommended as second-line therapy. Ozempic also provides cardiovascular benefit, which is especially relevant given the patient's risk profile.",
  objectionHandlers: {
    "We need to try a preferred alternative first":
      "The patient has already completed step therapy with metformin at maximum dose for 6 months without adequate glycemic control. I can provide documentation of this from the prescribing physician.",
    "The prior auth form hasn't been submitted":
      "I understand. Could you confirm the fax number for submitting the prior auth form? I'll ensure it's sent within the hour along with all supporting clinical documentation.",
    "This medication requires clinical review":
      "Absolutely, we'd welcome a clinical review. Could we schedule a peer-to-peer review between the medical director and the prescribing physician, Dr. Chen?",
  },
  escalationTrigger:
    "If the representative is unable to process the request or denies it outright, ask to speak with a supervisor or request a peer-to-peer review with the plan's medical director.",
  closing:
    "Before we end the call, could you please confirm: 1) The reference number for this request, 2) The expected timeline for a decision, 3) Any additional documentation needed, and 4) The best number to call back for status updates?",
  estimatedDuration: "4-6 minutes",
  fullScript:
    "Hello, my name is Navigator AI and I'm calling on behalf of patient Maria Santos, member ID BCX-449281, regarding a prior authorization request for Ozempic...",
};

export const MOCK_OUTCOME: CallOutcome = {
  status: "approved",
  referenceNumber: "PA-2024-ZQ4819",
  summary:
    "Prior authorization for Ozempic (semaglutide) 0.5mg weekly injection has been approved for 6 months. The authorization is effective immediately and the prescription can be filled at any in-network pharmacy.",
  nextAction: "Fill prescription at pharmacy — authorization is active",
  nextActionDate: "Effective now through September 21, 2026",
  transcript:
    "[00:00] Navigator AI: Hello, my name is Navigator AI and I'm calling on behalf of patient Maria Santos...\n[00:15] Agent: Thank you for calling Blue Cross Prior Authorization. How can I help?\n[00:22] Navigator AI: I'm calling regarding a prior authorization request for Ozempic for member BCX-449281...\n[01:30] Agent: I can see the request. Let me pull up the clinical criteria...\n[02:45] Agent: The patient has met step therapy requirements with metformin. I see the A1C documentation...\n[03:30] Agent: I'm going to approve this authorization for a 6-month period.\n[03:45] Navigator AI: Thank you. Could you confirm the reference number and timeline?\n[04:00] Agent: The reference number is PA-2024-ZQ4819. It's effective immediately.\n[04:15] Navigator AI: Thank you for your help today. Goodbye.",
};

// Dashboard mock data
export const MOCK_CALL_LOG = [
  { id: "1", patient: "Maria S.", task: "Ozempic prior auth", outcome: "approved" as const, duration: 252, time: "2 min ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "2", patient: "James K.", task: "MRI claim appeal", outcome: "follow-up" as const, duration: 480, time: "8 min ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "3", patient: "Sarah L.", task: "Specialist referral", outcome: "approved" as const, duration: 185, time: "15 min ago", apis: ["Gemini", "Vapi"] },
  { id: "4", patient: "Robert M.", task: "Billing dispute $2,400", outcome: "escalated" as const, duration: 612, time: "22 min ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "5", patient: "Linda P.", task: "Cardiology referral", outcome: "approved" as const, duration: 198, time: "31 min ago", apis: ["Gemini", "Vapi"] },
  { id: "6", patient: "David W.", task: "Insulin prior auth", outcome: "approved" as const, duration: 310, time: "45 min ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "7", patient: "Jennifer T.", task: "Denied PT claim appeal", outcome: "follow-up" as const, duration: 425, time: "1 hr ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "8", patient: "Michael R.", task: "Lab pre-authorization", outcome: "approved" as const, duration: 142, time: "1 hr ago", apis: ["Gemini", "Vapi"] },
  { id: "9", patient: "Patricia H.", task: "Surgery pre-auth", outcome: "escalated" as const, duration: 720, time: "2 hr ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "10", patient: "Thomas B.", task: "Prescription transfer", outcome: "approved" as const, duration: 95, time: "2 hr ago", apis: ["Vapi"] },
  { id: "11", patient: "Nancy C.", task: "Out-of-network appeal", outcome: "follow-up" as const, duration: 540, time: "3 hr ago", apis: ["Perplexity", "Gemini", "Vapi"] },
  { id: "12", patient: "Steven G.", task: "DME authorization", outcome: "approved" as const, duration: 275, time: "3 hr ago", apis: ["Perplexity", "Gemini", "Vapi"] },
];

export const MOCK_PATIENT_QUEUE = [
  { id: "1", name: "Angela F.", task: "Prior auth — Humira", status: "Calling" as const },
  { id: "2", name: "Kevin D.", task: "Denied claim appeal", status: "Researching" as const },
  { id: "3", name: "Rachel W.", task: "Specialist referral", status: "Script ready" as const },
  { id: "4", name: "Marcus J.", task: "Billing dispute", status: "On hold" as const },
  { id: "5", name: "Diane L.", task: "Lab pre-authorization", status: "Researching" as const },
];

export const MOCK_WEEKLY_CALLS = [
  { day: "Mon", calls: 38 },
  { day: "Tue", calls: 52 },
  { day: "Wed", calls: 45 },
  { day: "Thu", calls: 61 },
  { day: "Fri", calls: 47 },
  { day: "Sat", calls: 12 },
  { day: "Sun", calls: 8 },
];

export const MOCK_TASK_TYPES = [
  { name: "Prior Auth", value: 42, color: "#3b82f6" },
  { name: "Claim Appeal", value: 28, color: "#f59e0b" },
  { name: "Referral", value: 18, color: "#10b981" },
  { name: "Billing", value: 12, color: "#ef4444" },
];

export const MOCK_RECENT_OUTCOMES = [
  { id: "1", initials: "MS", task: "Ozempic prior auth", outcome: "approved" as const, ref: "PA-ZQ4819" },
  { id: "2", initials: "JK", task: "MRI claim appeal", outcome: "follow-up" as const, ref: "AP-8834" },
  { id: "3", initials: "SL", task: "Cardiology referral", outcome: "approved" as const, ref: "RF-2291" },
  { id: "4", initials: "RM", task: "Billing dispute $2.4k", outcome: "escalated" as const, ref: "BD-5510" },
  { id: "5", initials: "LP", task: "Specialist referral", outcome: "approved" as const, ref: "RF-3302" },
  { id: "6", initials: "DW", task: "Insulin prior auth", outcome: "approved" as const, ref: "PA-7741" },
  { id: "7", initials: "JT", task: "PT claim appeal", outcome: "follow-up" as const, ref: "AP-1198" },
  { id: "8", initials: "MR", task: "Lab pre-auth", outcome: "approved" as const, ref: "PA-6623" },
];
