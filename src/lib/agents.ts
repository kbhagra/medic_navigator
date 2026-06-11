// Multi-Agent Orchestration System — Agent Definitions
// Each agent defines its identity + prompt template. All results come from live API calls.

export type AgentDef = {
  id: string;
  name: string;
  model: string;
  wave: number;
  waveLabel: string;
  type: "parallel" | "sequential" | "hybrid";
  promptTemplate: string;
};

export const WAVE_LABELS: Record<number, { label: string; type: string }> = {
  1: { label: "DATA INGESTION", type: "Parallel" },
  2: { label: "DEEP ANALYSIS", type: "Parallel" },
  3: { label: "VALIDATION", type: "Sequential" },
  4: { label: "DECISION", type: "Hybrid" },
  5: { label: "FINAL REVIEW", type: "Sequential" },
};

export const AGENTS: AgentDef[] = [
  // Wave 1 — Data Ingestion (Parallel)
  {
    id: "symptom-parser", name: "Symptom Parser", model: "Gemini 2.5 Flash",
    wave: 1, waveLabel: "DATA INGESTION", type: "parallel",
    promptTemplate: `You are a clinical symptom extraction agent. Analyze the patient transcript and extracted data below.

PATIENT CONTEXT:
{context}

Identify all symptoms mentioned, classify severity, onset, duration. Return JSON:
{"finding": "<1 sentence summary>", "details": ["<detail 1>", ...], "confidence": <0-100>}`,
  },
  {
    id: "vitals-analyzer", name: "Vitals Analyzer", model: "Gemini 2.5 Flash",
    wave: 1, waveLabel: "DATA INGESTION", type: "parallel",
    promptTemplate: `You are a vitals analysis agent. Evaluate the patient's vital signs and flag abnormalities.

PATIENT CONTEXT:
{context}

Assess each vital sign against clinical norms. Consider patient history (DM, HTN, etc). Return JSON:
{"finding": "<1 sentence summary>", "details": ["<detail 1>", ...], "confidence": <0-100>}`,
  },
  {
    id: "lab-interpreter", name: "Lab Interpreter", model: "Gemini 2.5 Flash",
    wave: 1, waveLabel: "DATA INGESTION", type: "parallel",
    promptTemplate: `You are a laboratory results interpreter. Analyze any lab values mentioned or inferred from patient history.

PATIENT CONTEXT:
{context}

Identify abnormal values, clinical significance, and implications. Return JSON:
{"finding": "<1 sentence summary>", "details": ["<detail 1>", ...], "confidence": <0-100>}`,
  },
  {
    id: "med-reviewer", name: "Medication Reviewer", model: "Gemini 2.5 Flash",
    wave: 1, waveLabel: "DATA INGESTION", type: "parallel",
    promptTemplate: `You are a medication review agent. Analyze the patient's current medications for interactions, appropriateness, and allergy concerns.

PATIENT CONTEXT:
{context}

Check for drug interactions, dosage concerns, allergy contraindications. Return JSON:
{"finding": "<1 sentence summary>", "details": ["<detail 1>", ...], "confidence": <0-100>}`,
  },

  // Wave 2 — Deep Analysis (Parallel)
  {
    id: "diff-diagnosis", name: "Differential Dx Engine", model: "Gemini 2.5 Flash",
    wave: 2, waveLabel: "DEEP ANALYSIS", type: "parallel",
    promptTemplate: `You are a differential diagnosis engine. Using all available patient data, generate a ranked differential diagnosis list.

PATIENT CONTEXT:
{context}

WAVE 1 FINDINGS:
{previousFindings}

Rank differentials by probability. Return JSON:
{"finding": "<top 3 differentials with percentages>", "details": ["1. <diagnosis> — <probability>% (<reasoning>)", ...], "confidence": <0-100>}`,
  },
  {
    id: "deep-pattern", name: "Deep Pattern Recognition", model: "Gemini 2.5 Flash",
    wave: 2, waveLabel: "DEEP ANALYSIS", type: "parallel",
    promptTemplate: `You are a deep pattern recognition agent analyzing clinical presentations. Look for non-obvious correlations across symptoms, history, and labs.

PATIENT CONTEXT:
{context}

WAVE 1 FINDINGS:
{previousFindings}

Identify hidden patterns, cross-correlations, and risk factors. Return JSON:
{"finding": "<1 sentence pattern summary>", "details": ["<pattern 1>", ...], "confidence": <0-100>}`,
  },
  {
    id: "risk-stratification", name: "Risk Stratification", model: "Gemini 2.5 Flash",
    wave: 2, waveLabel: "DEEP ANALYSIS", type: "parallel",
    promptTemplate: `You are a risk stratification agent. Calculate cardiovascular, surgical, and mortality risk scores.

PATIENT CONTEXT:
{context}

WAVE 1 FINDINGS:
{previousFindings}

Compute relevant risk scores (Framingham, ASCVD, surgical risk). Return JSON:
{"finding": "<overall risk tier and key scores>", "details": ["<score 1>", ...], "confidence": <0-100>}`,
  },
  {
    id: "comorbidity-analyzer", name: "Comorbidity Analyzer", model: "Gemini 2.5 Flash",
    wave: 2, waveLabel: "DEEP ANALYSIS", type: "parallel",
    promptTemplate: `You are a comorbidity analysis agent. Evaluate how the patient's existing conditions interact with the current presentation.

PATIENT CONTEXT:
{context}

WAVE 1 FINDINGS:
{previousFindings}

Identify synergistic risks from comorbid conditions. Return JSON:
{"finding": "<1 sentence comorbidity impact>", "details": ["<interaction 1>", ...], "confidence": <0-100>}`,
  },

  // Wave 3 — Validation (Sequential) — uses Perplexity for RAG
  {
    id: "cross-ref-verifier", name: "Cross-Reference Verifier", model: "Perplexity sonar-pro",
    wave: 3, waveLabel: "VALIDATION", type: "sequential",
    promptTemplate: `Verify the following clinical findings against current medical literature (UpToDate, DynaMed, BMJ Best Practice, Cochrane, FDA databases).

PATIENT CONTEXT:
{context}

FINDINGS TO VERIFY:
{previousFindings}

For each finding, confirm or refute with citations. Return JSON:
{"finding": "<validation summary>", "details": ["<source>: <finding> — CONFIRMED/REFUTED", ...], "confidence": <0-100>}`,
  },
  {
    id: "guidelines-agent", name: "Clinical Guidelines", model: "Perplexity sonar-pro",
    wave: 3, waveLabel: "VALIDATION", type: "sequential",
    promptTemplate: `Check the patient's presentation and proposed management against current clinical practice guidelines.

PATIENT CONTEXT:
{context}

CURRENT FINDINGS:
{previousFindings}

Reference ACC/AHA, ADA, AAN, JNC guidelines as appropriate. Return JSON:
{"finding": "<guideline compliance summary>", "details": ["<guideline>: <recommendation> — MET/NOT MET", ...], "confidence": <0-100>}`,
  },
  {
    id: "evidence-scorer", name: "Evidence Quality Scorer", model: "Gemini 2.5 Flash",
    wave: 3, waveLabel: "VALIDATION", type: "sequential",
    promptTemplate: `You are an evidence quality assessment agent. Score the overall quality and concordance of the analysis so far.

PATIENT CONTEXT:
{context}

ALL FINDINGS:
{previousFindings}

Evaluate evidence level, concordance, and recommendation strength. Return JSON:
{"finding": "<evidence quality summary>", "details": ["<metric>: <score/assessment>", ...], "confidence": <0-100>}`,
  },

  // Wave 4 — Decision (Hybrid)
  {
    id: "treatment-protocol", name: "Treatment Protocol", model: "Gemini 2.5 Flash",
    wave: 4, waveLabel: "DECISION", type: "hybrid",
    promptTemplate: `You are a treatment protocol generator. Based on all prior analysis, generate a prioritized treatment plan.

PATIENT CONTEXT:
{context}

ALL FINDINGS:
{previousFindings}

Create immediate, short-term, and ongoing treatment actions. Return JSON:
{"finding": "<top 3 treatment recommendations>", "details": ["IMMEDIATE: <action>", "24H: <action>", ...], "confidence": <0-100>}`,
  },
  {
    id: "specialist-referral", name: "Specialist Referral", model: "Gemini 2.5 Flash",
    wave: 4, waveLabel: "DECISION", type: "hybrid",
    promptTemplate: `You are a specialist referral agent. Determine which specialists should be consulted, their urgency, and timeframes.

PATIENT CONTEXT:
{context}

ALL FINDINGS:
{previousFindings}

Recommend specialist referrals with urgency tiers. Return JSON:
{"finding": "<referral summary>", "details": ["<SPECIALTY> — <Urgency> (within <timeframe>): <reason>", ...], "confidence": <0-100>}`,
  },

  // Wave 5 — Final Review (Sequential)
  {
    id: "peer-review-judge", name: "Peer Review Judge", model: "Gemini 2.5 Flash",
    wave: 5, waveLabel: "FINAL REVIEW", type: "sequential",
    promptTemplate: `You are a peer review judge. Audit all 14 prior agent findings for contradictions, bias, or gaps.

PATIENT CONTEXT:
{context}

ALL AGENT FINDINGS:
{previousFindings}

Check inter-agent agreement, identify contradictions, assess completeness. Return JSON:
{"finding": "<review summary>", "details": ["Inter-agent agreement: <X/14>", "Contradictions: <count>", ...], "confidence": <0-100>}`,
  },
  {
    id: "consensus-final", name: "Consensus Engine", model: "Gemini 2.5 Flash",
    wave: 5, waveLabel: "FINAL REVIEW", type: "sequential",
    promptTemplate: `You are the final consensus engine. Synthesize all 14 agent findings into a single definitive assessment.

PATIENT CONTEXT:
{context}

ALL AGENT FINDINGS:
{previousFindings}

Produce the final diagnosis with weighted confidence. Return JSON:
{"finding": "FINAL: <primary diagnosis> (<confidence>% confidence). <1 sentence action>", "details": ["PRIMARY DIAGNOSIS: <diagnosis>", "CONFIDENCE: <X>%", "RISK LEVEL: <level>", "ACTION: <immediate action>", "FOLLOW-UP: <plan>", "PROGNOSIS: <outlook>"], "confidence": <0-100>}`,
  },
];
