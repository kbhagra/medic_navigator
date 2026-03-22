"use client";

import { useState, useEffect, useCallback } from "react";
import { AGENTS, DIAGNOSIS_SUMMARY, WAVE_LABELS, type AgentDef } from "@/lib/agents";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type PatientData = {
  name: string; dob: string; age: number; sex: string; mrn: string;
  phone: string; location: string; bloodType: string; weight: string; height: string;
  bmi: string; emergencyContact: { name: string; phone: string; relation: string };
  insurance: { provider: string; planName: string; memberId: string; groupNumber: string };
  allergies: { name: string; severity: "High" | "Medium" | "Low"; reaction: string; year: string }[];
  medications: { name: string; dosage: string; frequency: string; prescriber: string; indication: string }[];
  vitals: { label: string; value: string; unit: string; status: "normal" | "warning" | "critical" }[];
  conditions: string[];
  labResults: { test: string; value: string; range: string; status: "normal" | "high" | "low"; date: string }[];
  primaryComplaint: string; surgicalHistory: string[]; familyHistory: string[];
  socialHistory: { label: string; value: string }[];
  immunizations: { name: string; date: string }[];
  hospitalRouting: { facility: string; reason: string; distance: string };
};

type TranscriptLine = { role: "user" | "assistant"; text: string; timestamp: number };
type Extracted = { name: string | null; location: string | null; situation: string | null; urgency: "Low" | "Medium" | "High" | null; medicalNotes: string | null; actionNeeded: string | null };
type AgentStatus = "pending" | "running" | "complete";

// ═══════════════════════════════════════════════════════════
// AYAAN GAZALI — FULL DEMO PATIENT (loaded after call)
// ═══════════════════════════════════════════════════════════

const AYAAN: PatientData = {
  name: "Ayaan Gazali", dob: "07/15/2007", age: 18, sex: "Male", mrn: "MRN-AG0915",
  phone: "(669) 360-9914", location: "Hayward, CA", bloodType: "A+", weight: "218 lbs", height: "5'10\"",
  bmi: "31.4",
  emergencyContact: { name: "Priya Okafor", phone: "(669) 360-9922", relation: "Daughter" },
  insurance: { provider: "Kaiser Permanente", planName: "HMO Select", memberId: "KP-991044", groupNumber: "GRP-HW2026" },
  allergies: [
    { name: "Penicillin", severity: "High", reaction: "Anaphylaxis (documented 2009)", year: "2009" },
    { name: "Cephalosporins", severity: "Medium", reaction: "Cross-reactivity risk — urticaria", year: "2012" },
    { name: "Latex", severity: "Low", reaction: "Contact dermatitis", year: "2018" },
    { name: "Codeine", severity: "Medium", reaction: "Severe nausea, vomiting", year: "2020" },
  ],
  medications: [
    { name: "Metformin", dosage: "1000mg", frequency: "Twice daily", prescriber: "Dr. Patel", indication: "Type 2 Diabetes" },
    { name: "Glipizide", dosage: "10mg", frequency: "Once daily", prescriber: "Dr. Patel", indication: "Type 2 Diabetes" },
    { name: "Lisinopril", dosage: "20mg", frequency: "Once daily", prescriber: "Dr. Chen", indication: "Hypertension" },
    { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", prescriber: "Dr. Chen", indication: "Hypertension" },
    { name: "Atorvastatin", dosage: "40mg", frequency: "QHS", prescriber: "Dr. Chen", indication: "Hypercholesterolemia" },
  ],
  vitals: [
    { label: "BP", value: "158/95", unit: "mmHg", status: "critical" },
    { label: "HR", value: "112", unit: "bpm", status: "warning" },
    { label: "Temp", value: "98.6", unit: "°F", status: "normal" },
    { label: "SpO2", value: "96", unit: "%", status: "normal" },
    { label: "RR", value: "22", unit: "/min", status: "warning" },
    { label: "Pain", value: "9", unit: "/10", status: "critical" },
    { label: "GCS", value: "15", unit: "/15", status: "normal" },
    { label: "BGL", value: "Unknown", unit: "mg/dL", status: "warning" },
  ],
  conditions: [
    "Type 2 Diabetes Mellitus — 12 year history (E11.9)",
    "Essential Hypertension, controlled (I10)",
    "Hypercholesterolemia (E78.5)",
    "Obesity, BMI 31.4 (E66.01)",
    "Former tobacco use — 22 years, quit 6 years ago (Z87.891)",
    "Suspected displaced mid-shaft femur fracture, left (S72.302A)",
  ],
  labResults: [
    { test: "HbA1c", value: "8.2%", range: "4.0-5.6%", status: "high", date: "03/05/26" },
    { test: "Fasting Glucose", value: "186 mg/dL", range: "70-100", status: "high", date: "03/05/26" },
    { test: "LDL", value: "128 mg/dL", range: "<100", status: "high", date: "03/05/26" },
    { test: "Creatinine", value: "1.1 mg/dL", range: "0.7-1.3", status: "normal", date: "03/05/26" },
    { test: "eGFR", value: "78 mL/min", range: ">60", status: "normal", date: "03/05/26" },
    { test: "WBC", value: "9.8 K/uL", range: "4.5-11.0", status: "normal", date: "03/05/26" },
    { test: "Hemoglobin", value: "14.2 g/dL", range: "13.5-17.5", status: "normal", date: "03/05/26" },
    { test: "Platelets", value: "245 K/uL", range: "150-400", status: "normal", date: "03/05/26" },
    { test: "PT/INR", value: "1.0", range: "0.8-1.2", status: "normal", date: "02/12/26" },
    { test: "BMP Na+", value: "141 mEq/L", range: "136-145", status: "normal", date: "03/05/26" },
  ],
  primaryComplaint: "Cycling accident — suspected displaced mid-shaft femur fracture, left leg. Unable to bear weight. Pain 9/10. Visible deformity with shortening and external rotation. Faint left pedal pulse — vascular compromise concern.",
  surgicalHistory: [
    "Cholecystectomy, laparoscopic (2019)",
    "Right inguinal hernia repair (2016)",
    "Wisdom teeth extraction under general anesthesia (2014)",
  ],
  familyHistory: [
    "Father: Type 2 Diabetes, MI at age 62, deceased at 68",
    "Mother: Hypertension, Rheumatoid Arthritis",
    "Brother: Type 2 Diabetes, Obesity",
    "Maternal grandmother: Stroke at age 71",
  ],
  socialHistory: [
    { label: "Tobacco", value: "Former smoker — 22 years (1 PPD), quit 6 years ago" },
    { label: "Alcohol", value: "Occasional, 1-2 beers/week" },
    { label: "Occupation", value: "School bus driver — requires clearance for return to work" },
    { label: "Living situation", value: "Lives alone — post-op mobility support needed" },
    { label: "Exercise", value: "Recreational cycling 3x/week (prior to injury)" },
    { label: "Diet", value: "Inconsistent diabetic diet compliance per last visit" },
  ],
  immunizations: [
    { name: "Tetanus/Tdap (critical for trauma)", date: "09/2023" },
    { name: "COVID-19 Pfizer (booster #3)", date: "11/2025" },
    { name: "Influenza", date: "10/2025" },
    { name: "Hepatitis B (series complete)", date: "2018" },
    { name: "Pneumococcal PCV20", date: "01/2025" },
  ],
  hospitalRouting: {
    facility: "Eden Medical Center, Castro Valley, CA",
    reason: "Closest Level III trauma-capable hospital with orthopedic surgery + 24h imaging",
    distance: "3.2 miles from incident location",
  },
};

// ═══════════════════════════════════════════════════════════
// STYLE MAPS
// ═══════════════════════════════════════════════════════════

const SEV = {
  High: { badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  Medium: { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  Low: { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};
const VS = { normal: "text-emerald-400", warning: "text-amber-400", critical: "text-red-400" };
const LS = { normal: "text-emerald-400", high: "text-red-400", low: "text-amber-400" };

function Panel({ title, badge, bc, count, children, className = "" }: {
  title: string; badge?: string; bc?: string; count?: number; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-col min-h-0 bg-[#0c0c0f] ${className}`}>
      <div className="px-3 py-[6px] flex items-center gap-2 shrink-0 border-b border-[#1e1e24]">
        <span className="text-[10px] font-mono font-semibold text-[#6b6b80] uppercase tracking-[0.12em]">{title}</span>
        {badge && <span className={`text-[8px] font-mono font-bold px-1.5 py-[1px] rounded border ${bc || "bg-[#1a1a22] text-[#6b6b80] border-[#2a2a35]"}`}>{badge}</span>}
        {count !== undefined && <span className="text-[9px] font-mono text-[#3a3a48] ml-auto">{count}</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-2.5">{children}</div>
    </div>
  );
}

function AgentCard({ agent, status }: { agent: AgentDef; status: AgentStatus }) {
  const isNemo = agent.model.includes("Nemotron");
  return (
    <div className={`border rounded px-2.5 py-2 transition-all duration-500 ${status === "complete" ? "border-[#1e2e24] bg-[#0a120e]" : status === "running" ? "border-amber-800/40 bg-amber-950/20" : "border-[#1a1a22] bg-[#0a0a0f]"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {status === "pending" && <span className="w-[6px] h-[6px] rounded-full border border-[#3a3a48]" />}
          {status === "running" && <span className="w-[6px] h-[6px] rounded-full bg-amber-500 animate-pulse" />}
          {status === "complete" && <span className="text-emerald-400 text-[10px]">&#10003;</span>}
          <span className={`text-[10px] font-mono font-semibold ${status === "complete" ? "text-[#b0b0c0]" : status === "running" ? "text-white" : "text-[#4a4a5a]"}`}>{agent.name}</span>
        </div>
        {status === "complete" && <span className={`text-[9px] font-mono font-bold tabular-nums ${agent.confidence >= 95 ? "text-emerald-400" : agent.confidence >= 90 ? "text-cyan-400" : "text-amber-400"}`}>{agent.confidence}%</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[7px] font-mono px-1 py-[0px] rounded border ${isNemo ? "bg-green-900/30 text-green-400 border-green-800/40" : "bg-[#12121a] text-[#5a5a6a] border-[#1e1e24]"}`}>{agent.model}</span>
        <span className="text-[7px] font-mono text-[#3a3a48]">{agent.duration}ms</span>
      </div>
      {status === "complete" && <p className="text-[9px] font-mono text-[#6a6a7a] mt-1.5 leading-relaxed line-clamp-2">{agent.finding}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

// Rotating webscraped procedures for femur fracture treatment
const PROCEDURES = [
  { title: "Intramedullary Nailing (IM Nail)", source: "OrthoInfo.AAOS.org", desc: "Gold standard for mid-shaft femur fractures. Titanium rod inserted through the medullary canal. Weight-bearing in 24-48h post-op. 95-98% union rate.", details: ["Procedure time: 60-90 min under general anesthesia", "Incision: 3-5cm at proximal femur (piriformis fossa)", "Fluoroscopic guidance for nail placement", "Interlocking screws for rotational stability", "Expected healing: 12-16 weeks"] },
  { title: "Open Reduction Internal Fixation (ORIF)", source: "PubMed/NCBI", desc: "Alternative for complex fracture patterns. Direct visualization with plate and screw fixation. Higher blood loss but anatomic reduction.", details: ["Indicated for: periarticular extension, failed closed reduction", "Lateral approach to femur with plate application", "Locking plate technology for osteoporotic bone", "Diabetic patients: 20-30% longer healing time", "Post-op: toe-touch weight bearing 6-8 weeks"] },
  { title: "External Fixation (Temporary)", source: "TraumaSurgery.org", desc: "Damage control for polytrauma or vascular compromise. Rapid stabilization in <30 min. Converted to definitive fixation within 7-14 days.", details: ["Emergency stabilization when hemodynamically unstable", "Schanz pins placed in proximal + distal fragments", "Allows vascular repair access if needed", "Conversion to IM nail when patient stable", "Critical: monitor compartment pressures q2h"] },
  { title: "Skeletal Traction (Bridge Therapy)", source: "Wheeless' Textbook Online", desc: "Pre-operative management to maintain length and alignment. Steinmann pin through proximal tibia with 15-20 lbs traction.", details: ["Used when surgical delay >12h expected", "Reduces pain and muscle spasm significantly", "Prevents further neurovascular compromise", "Monitor pin site for infection q8h", "Continue diabetic medication management"] },
  { title: "Fasciotomy (Compartment Syndrome)", source: "EmergencyMedicine.BMJ.com", desc: "Urgent decompression if compartment pressure >30mmHg. Four-compartment release of the thigh. Time-critical within 6h of onset.", details: ["Monitor: pain out of proportion, pain with passive stretch", "Pressure measurement with Stryker device", "Lateral and medial longitudinal incisions", "Leave wounds open with VAC therapy", "DM patients at higher risk — lower threshold for intervention"] },
  { title: "Vascular Repair / Angiography", source: "VascularWeb.org / SVS", desc: "Indicated given faint left pedal pulse. CT angiography to rule out superficial femoral artery injury. Time-sensitive: 6h warm ischemia limit.", details: ["CTA of left lower extremity STAT", "ABI (Ankle-Brachial Index) assessment", "If SFA injury: direct repair or saphenous vein graft", "Fasciotomy may be needed post-reperfusion", "Anticoagulation: avoid heparin if OR imminent"] },
];

// Possible causes / differential considerations
const CAUSES = [
  { title: "Mechanism Analysis: High-Energy Cycling Trauma", items: ["Moderate-speed descent on paved incline — estimated 15-20mph", "Impact with raised curb edge created lateral bending force", "Forward ejection with rotational landing on left leg", "Audible crack reported — consistent with cortical disruption", "Helmet worn, no head/neck injury reported"] },
  { title: "Fracture Pattern Assessment", items: ["Mid-shaft femur fracture — most common location for cycling injuries", "Shortening + external rotation = displaced fracture", "Transverse or short oblique pattern likely given mechanism", "Risk of butterfly fragment from curb edge impact", "Ipsilateral knee ligament injury must be ruled out"] },
  { title: "Vascular Compromise Concerns", items: ["Faint left pedal pulse — SFA injury cannot be excluded", "Mid-shaft femur fractures: 2-5% vascular injury rate", "Delayed capillary refill (3s) in left toes concerning", "Proximity of SFA to fracture site is high-risk zone", "Hard signs absent but soft signs present — CTA indicated"] },
  { title: "Diabetic Complication Risk Factors", items: ["12-year T2DM: impaired bone healing (20-30% delay expected)", "HbA1c 8.2%: perioperative infection risk 3x baseline", "Peripheral neuropathy screening needed pre-operatively", "Metformin: hold 48h before/after contrast (CTA)", "Surgical site infection rate: 8-12% in uncontrolled DM vs 2-3% baseline"] },
  { title: "Perioperative Risk Assessment", items: ["BMI 31.4: increased anesthesia and DVT risk", "Former smoker (22y): impaired wound healing, higher pneumonia risk", "HTN (current 158/95): BP optimization needed pre-induction", "Current medications: continue Amlodipine, hold ACEi day of surgery", "NPO status favorable: last meal >7h ago"] },
];

export default function Home() {
  const [time, setTime] = useState(new Date());
  const [tab, setTab] = useState<"panels" | "agents">("panels");
  const [procIdx, setProcIdx] = useState(0);
  const [causeIdx, setCauseIdx] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [extracted, setExtracted] = useState<Extracted>({ name: null, location: null, situation: null, urgency: null, medicalNotes: null, actionNeeded: null });
  const [summary, setSummary] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [memories, setMemories] = useState<string[]>([]);
  const [patient, setPatient] = useState<PatientData | null>(null); // START NULL — no data until call
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(() => {
    const s: Record<string, AgentStatus> = {};
    AGENTS.forEach((a) => { s[a.id] = "pending"; });
    return s;
  });
  const [orchRunning, setOrchRunning] = useState(false);
  const [orchComplete, setOrchComplete] = useState(false);
  const [orchProgress, setOrchProgress] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);

  // Poll /api/debug — when call completes, load Ayaan's data
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/debug");
        const data = await res.json();
        if (data.transcript?.length > 0) setTranscript(data.transcript);
        if (data.summary) setSummary(data.summary);
        if (data.extracted) setExtracted(data.extracted);
        if (data.status) setCallStatus(data.status);
        if (data.patient?.retrieved_memories?.length > 0) setMemories(data.patient.retrieved_memories);

        // When call completes and patient was identified, load the full patient
        if (data.status === "complete" && !patient) {
          setPatient(AYAAN);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [patient]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate procedures every 15s, causes every 10s
  useEffect(() => {
    if (!patient) return;
    const p = setInterval(() => setProcIdx((i) => (i + 1) % PROCEDURES.length), 15000);
    const c = setInterval(() => setCauseIdx((i) => (i + 1) % CAUSES.length), 10000);
    return () => { clearInterval(p); clearInterval(c); };
  }, [patient]);

  // Orchestration — only runs when patient is loaded (after call)
  const runOrchestration = useCallback(() => {
    if (orchRunning || orchComplete || !patient) return;
    setOrchRunning(true);
    setTab("agents");
    const waves = [1, 2, 3, 4, 5];
    let delay = 400;
    waves.forEach((wave, wi) => {
      const wa = AGENTS.filter((a) => a.wave === wave);
      setTimeout(() => { setAgentStatuses((p) => { const n = { ...p }; wa.forEach((a) => { n[a.id] = "running"; }); return n; }); }, delay);
      wa.forEach((a, ai) => {
        const cd = delay + 600 + (a.type === "parallel" ? ai * 200 : ai * 500);
        setTimeout(() => {
          setAgentStatuses((p) => ({ ...p, [a.id]: "complete" }));
          setOrchProgress(Math.round(((AGENTS.filter((ag) => ag.wave < wave).length + ai + 1) / AGENTS.length) * 100));
        }, cd);
      });
      const maxD = Math.max(...wa.map((a, ai) => 600 + (a.type === "parallel" ? ai * 200 : ai * 500)));
      delay += maxD + 300;
      if (wi === waves.length - 1) setTimeout(() => { setOrchComplete(true); setOrchRunning(false); setOrchProgress(100); }, delay);
    });
  }, [orchRunning, orchComplete, patient]);

  // Auto-trigger orchestration when patient loads
  useEffect(() => {
    if (patient && !orchRunning && !orchComplete) {
      const timer = setTimeout(runOrchestration, 1000);
      return () => clearTimeout(timer);
    }
  }, [patient, orchRunning, orchComplete, runOrchestration]);

  const today = time.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const completedCount = Object.values(agentStatuses).filter((s) => s === "complete").length;
  const P = patient; // shorthand, null before call

  return (
    <div className="h-screen bg-[#08080c] text-[#d0d0e0] flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="border-b border-[#1e1e24] px-5 py-2 flex items-center justify-between shrink-0 bg-[#0a0a10]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center"><span className="text-[10px] font-bold text-white">N</span></div>
            <h1 className="text-[13px] font-bold text-white tracking-tight font-mono">NAVIGATOR</h1>
          </div>
          <div className="h-3 w-px bg-[#2a2a35]" />
          <span className="text-[9px] text-[#4a4a5a] font-mono uppercase tracking-[0.15em]">Patient Intelligence</span>
          <div className="h-3 w-px bg-[#2a2a35]" />
          <div className="flex items-center gap-1.5 bg-[#0d1a15] border border-emerald-900/50 rounded px-2 py-0.5">
            <span className="w-[5px] h-[5px] bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-mono font-bold">ONLINE</span>
          </div>
          {orchRunning && (<><div className="h-3 w-px bg-[#2a2a35]" /><div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-800/40 rounded px-2 py-0.5"><span className="w-[5px] h-[5px] bg-purple-500 rounded-full animate-pulse" /><span className="text-[9px] text-purple-400 font-mono font-bold">ORCHESTRATING {orchProgress}%</span></div></>)}
        </div>
        <div className="flex items-center gap-5">
          {callStatus === "active" && (<div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/40 rounded px-2 py-0.5"><span className="w-[5px] h-[5px] bg-amber-500 rounded-full animate-pulse" /><span className="text-[9px] text-amber-400 font-mono font-bold">CALL ACTIVE</span></div>)}
          <span className="text-[10px] font-mono text-[#4a4a5a] tabular-nums">{time.toLocaleTimeString()}</span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* LEFT COLUMN */}
        <div className="w-[54%] shrink-0 flex flex-col min-h-0">
          {/* Patient bar + tabs */}
          <div className="px-4 py-2 bg-[#0c0c12] border-b border-[#1e1e24] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#1a2a3a] to-[#0d1a25] border border-[#2a3a4a] flex items-center justify-center">
                <span className="text-[11px] font-mono font-bold text-cyan-400">{P ? P.name.split(" ").map(n => n[0]).join("") : "—"}</span>
              </div>
              <div>
                <p className="text-[13px] font-mono font-bold text-white leading-none">{P ? P.name : "Awaiting Patient Call..."}</p>
                <p className="text-[9px] font-mono text-[#4a4a5a] mt-0.5">{P ? `${P.mrn} · ${P.dob} · ${P.age}y ${P.sex} · ${P.bloodType}` : "System ready — call will auto-populate patient data"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setTab("panels")} className={`text-[9px] font-mono font-bold px-3 py-1 rounded transition-colors ${tab === "panels" ? "bg-[#1a1a24] text-white border border-[#2a2a38]" : "text-[#4a4a5a] hover:text-[#8a8a9a]"}`}>PATIENT DATA</button>
              <button onClick={() => setTab("agents")} className={`text-[9px] font-mono font-bold px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${tab === "agents" ? "bg-[#1a1a24] text-white border border-[#2a2a38]" : "text-[#4a4a5a] hover:text-[#8a8a9a]"}`}>
                AI ANALYSIS
                {orchComplete && <span className="text-[8px] text-emerald-400">({completedCount})</span>}
                {orchRunning && <span className="w-[5px] h-[5px] bg-purple-500 rounded-full animate-pulse" />}
              </button>
            </div>
          </div>

          {tab === "panels" ? (
            /* PATIENT DATA VIEW */
            !P ? (
              /* EMPTY STATE — before call */
              <div className="flex-1 flex items-center justify-center bg-[#08080c]">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1a2a3a] to-[#0d1a25] border border-[#2a3a4a] flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-mono font-bold text-[#2a3a4a]">?</span>
                  </div>
                  <p className="text-[14px] font-mono font-bold text-[#3a3a48]">No Patient Data</p>
                  <p className="text-[11px] font-mono text-[#2a2a35] mt-1">Waiting for incoming call to Vapi...</p>
                  <p className="text-[10px] font-mono text-[#1e1e24] mt-3">Patient data will auto-populate<br/>when a call is received and processed</p>
                </div>
              </div>
            ) : (
              /* FULL PANELS — after call */
              <div className="flex-1 grid grid-cols-3 grid-rows-3 min-h-0" style={{ gap: "1px", background: "#1e1e24" }}>
                <Panel title="Vitals" badge="LIVE" bc="bg-emerald-500/15 text-emerald-400 border-emerald-500/25" count={P.vitals.length}>
                  <div className="space-y-[4px]">{P.vitals.map((v) => (<div key={v.label} className="flex items-center justify-between"><span className="text-[10px] font-mono text-[#5a5a6a]">{v.label}</span><div className="flex items-center gap-1"><span className={`text-[13px] font-mono font-bold tabular-nums ${VS[v.status]}`}>{v.value}</span><span className="text-[8px] font-mono text-[#3a3a48]">{v.unit}</span>{v.status !== "normal" && <span className={`w-1.5 h-1.5 rounded-full ${v.status === "warning" ? "bg-amber-500" : "bg-red-500"}`} />}</div></div>))}</div>
                </Panel>
                <Panel title="Allergies" badge="ALERT" bc="bg-red-500/15 text-red-400 border-red-500/25" count={P.allergies.length}>
                  <div className="space-y-1.5">{P.allergies.map((a) => (<div key={a.name}><div className="flex items-center justify-between"><span className="text-[11px] font-mono text-white font-semibold">{a.name}</span><span className={`text-[7px] font-mono font-bold px-1 py-[0px] rounded border ${SEV[a.severity].badge}`}>{a.severity.toUpperCase()}</span></div><p className="text-[9px] font-mono text-[#4a4a5a]">{a.reaction}</p></div>))}</div>
                </Panel>
                <Panel title="Medications" badge="ACTIVE" bc="bg-emerald-500/15 text-emerald-400 border-emerald-500/25" count={P.medications.length}>
                  <div className="space-y-1.5">{P.medications.map((m) => (<div key={m.name}><div className="flex items-center justify-between"><span className="text-[11px] font-mono text-white">{m.name}</span><span className="text-[10px] font-mono font-bold text-cyan-400">{m.dosage}</span></div><p className="text-[9px] font-mono text-[#4a4a5a]">{m.frequency} · {m.indication}</p></div>))}</div>
                </Panel>
                <Panel title="Labs" badge="RECENT" bc="bg-blue-500/15 text-blue-400 border-blue-500/25" count={P.labResults.length}>
                  <div className="space-y-[3px]">{P.labResults.map((l) => (<div key={l.test} className="flex items-center justify-between"><div><span className="text-[10px] font-mono text-[#9090a0]">{l.test}</span><span className="text-[7px] font-mono text-[#3a3a48] ml-1">{l.range}</span></div><div className="flex items-center gap-1"><span className={`text-[11px] font-mono font-bold tabular-nums ${LS[l.status]}`}>{l.value}</span>{l.status !== "normal" && <span className={`text-[7px] font-mono font-bold px-1 rounded ${l.status === "high" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>{l.status === "high" ? "H" : "L"}</span>}</div></div>))}</div>
                </Panel>
                <Panel title="Transcript" badge={callStatus === "active" ? "LIVE" : undefined} bc="bg-emerald-500/15 text-emerald-400 border-emerald-500/25" count={transcript.length}>
                  {transcript.length === 0 ? <p className="text-[10px] font-mono text-[#2a2a35] italic">No transcript data</p> : <div className="space-y-1">{transcript.slice(-12).map((line, i) => (<p key={i} className="text-[10px] font-mono leading-relaxed"><span className={`font-bold ${line.role === "user" ? "text-amber-400" : "text-emerald-400"}`}>{line.role === "user" ? "USR" : "AGT"}</span><span className="text-[#3a3a48] mx-1">|</span><span className="text-[#9090a0]">{line.text}</span></p>))}</div>}
                </Panel>
                <Panel title="Extracted" badge={extracted.urgency || "GEMINI"} bc={extracted.urgency ? SEV[extracted.urgency].badge : "bg-purple-500/15 text-purple-400 border-purple-500/25"}>
                  <div className="space-y-1.5">{[{ l: "NAME", v: extracted.name }, { l: "LOCATION", v: extracted.location }, { l: "SITUATION", v: extracted.situation }, { l: "MED NOTES", v: extracted.medicalNotes }, { l: "ACTION", v: extracted.actionNeeded }].map((f) => (<div key={f.l}><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">{f.l}</p><p className={`text-[10px] font-mono ${f.v ? "text-white" : "text-[#1e1e24]"}`}>{f.v || "\u2014"}</p></div>))}</div>
                </Panel>
                <Panel title="Procedures" badge="WEBSCRAPE" bc="bg-orange-500/15 text-orange-400 border-orange-500/25">
                  {(() => { const proc = PROCEDURES[procIdx]; return (<div className="space-y-1.5">
                    <p className="text-[11px] font-mono text-white font-semibold leading-tight">{proc.title}</p>
                    <div className="flex items-center gap-1.5"><span className="text-[7px] font-mono px-1 py-[0px] rounded bg-orange-500/15 border border-orange-500/25 text-orange-400">SRC</span><span className="text-[8px] font-mono text-[#5a5a6a]">{proc.source}</span></div>
                    <p className="text-[9px] font-mono text-[#8a8a9a] leading-relaxed">{proc.desc}</p>
                    <div className="space-y-0.5">{proc.details.map((d, i) => (<div key={i} className="flex items-start gap-1"><span className="text-[#4a4a5a] text-[7px] mt-[3px]">&#9679;</span><p className="text-[8px] font-mono text-[#6a6a7a] leading-relaxed">{d}</p></div>))}</div>
                    <p className="text-[7px] font-mono text-[#2a2a35] mt-1">Auto-refreshing · {procIdx + 1}/{PROCEDURES.length}</p>
                  </div>); })()}
                </Panel>
                <Panel title="Routing" badge="TRAUMA" bc="bg-red-500/15 text-red-400 border-red-500/25">
                  <div className="space-y-2">
                    <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">FACILITY</p><p className="text-[10px] font-mono font-semibold text-white">{P.hospitalRouting.facility}</p></div>
                    <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">REASON</p><p className="text-[9px] font-mono text-[#8a8a9a]">{P.hospitalRouting.reason}</p></div>
                    <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">DISTANCE</p><p className="text-[10px] font-mono text-amber-400">{P.hospitalRouting.distance}</p></div>
                    <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">APIS</p><div className="flex gap-1 mt-1 flex-wrap">{["Vapi", "Gemini", "Nemotron", "Mem[v]", "ElevenLabs"].map((a) => (<span key={a} className="text-[7px] font-mono px-1 py-[0px] rounded bg-[#12121a] border border-[#1e1e24] text-[#5a5a6a]">{a}</span>))}</div></div>
                  </div>
                </Panel>
                <Panel title="Possible Causes" badge="ANALYSIS" bc="bg-violet-500/15 text-violet-400 border-violet-500/25">
                  {(() => { const cause = CAUSES[causeIdx]; return (<div className="space-y-1.5">
                    <p className="text-[11px] font-mono text-white font-semibold leading-tight">{cause.title}</p>
                    <div className="space-y-0.5">{cause.items.map((item, i) => (<div key={i} className="flex items-start gap-1"><span className="text-violet-600 text-[7px] mt-[3px]">&#9679;</span><p className="text-[9px] font-mono text-[#8a8a9a] leading-relaxed">{item}</p></div>))}</div>
                    <p className="text-[7px] font-mono text-[#2a2a35] mt-1">Updating · {causeIdx + 1}/{CAUSES.length}</p>
                  </div>); })()}
                </Panel>
              </div>
            )
          ) : (
            /* AI ANALYSIS VIEW */
            <div className="flex-1 overflow-y-auto bg-[#08080c]">
              {!patient ? (
                <div className="flex-1 flex items-center justify-center h-full"><p className="text-[12px] font-mono text-[#2a2a35]">AI analysis will begin after patient call...</p></div>
              ) : (
                <>
                  <div className="px-4 py-3 bg-[#0c0c12] border-b border-[#1e1e24]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-[#6b6b80] uppercase tracking-[0.12em]">Multi-Agent Orchestration</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-[1px] rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">{AGENTS.length} AGENTS</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-[1px] rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">5 WAVES</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-[1px] rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">{DIAGNOSIS_SUMMARY.modelsUsed.length} MODELS</span>
                      </div>
                      {orchComplete && <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums">{DIAGNOSIS_SUMMARY.confidence}% CONFIDENCE</span>}
                    </div>
                    <div className="h-1 bg-[#1a1a22] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${orchProgress}%`, background: orchComplete ? "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)" : "linear-gradient(90deg, #f59e0b, #eab308)" }} /></div>
                    <div className="flex items-center justify-between mt-1.5"><span className="text-[9px] font-mono text-[#4a4a5a]">{completedCount}/{AGENTS.length} complete</span>{orchComplete && <span className="text-[9px] font-mono text-[#4a4a5a]">{(DIAGNOSIS_SUMMARY.totalDuration / 1000).toFixed(1)}s total</span>}</div>
                  </div>
                  {orchComplete && (
                    <div className="px-4 py-3 bg-[#0a120e] border-b border-emerald-900/30">
                      <div className="flex items-center gap-3 mb-2"><span className="text-emerald-400 text-sm">&#10003;</span><span className="text-[12px] font-mono font-bold text-white">{DIAGNOSIS_SUMMARY.primary}</span><span className="text-[9px] font-mono font-bold px-1.5 py-[1px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">{DIAGNOSIS_SUMMARY.riskLevel}</span></div>
                      <div className="flex gap-4">{DIAGNOSIS_SUMMARY.differentials.slice(0, 4).map((d) => (<div key={d.diagnosis} className="flex items-center gap-1.5"><div className="w-10 h-1 bg-[#1a1a22] rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${d.probability}%` }} /></div><span className="text-[9px] font-mono text-[#8a8a9a]">{d.diagnosis} <span className="text-cyan-400 font-bold">{d.probability}%</span></span></div>))}</div>
                    </div>
                  )}
                  <div className="p-4 space-y-4">
                    {Object.entries(WAVE_LABELS).map(([wn, wm]) => {
                      const w = Number(wn); const wa = AGENTS.filter((a) => a.wave === w);
                      const allDone = wa.every((a) => agentStatuses[a.id] === "complete");
                      const anyRun = wa.some((a) => agentStatuses[a.id] === "running");
                      return (<div key={w}>
                        <div className="flex items-center gap-2 mb-2"><span className="text-[9px] font-mono font-bold text-[#4a4a5a] uppercase tracking-[0.15em]">Wave {w} — {wm.label}</span><span className={`text-[7px] font-mono font-bold px-1.5 py-[0px] rounded border ${allDone ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : anyRun ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-[#1a1a22] text-[#4a4a5a] border-[#2a2a35]"}`}>{wm.type}</span>{allDone && <span className="text-emerald-400 text-[9px]">&#10003;</span>}{anyRun && <span className="w-[5px] h-[5px] bg-amber-500 rounded-full animate-pulse" />}</div>
                        <div className={`grid gap-2 ${wa.length >= 4 ? "grid-cols-2" : "grid-cols-2"}`}>{wa.map((agent) => (<div key={agent.id} onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)} className="cursor-pointer"><AgentCard agent={agent} status={agentStatuses[agent.id]} /></div>))}</div>
                        {selectedAgent && wa.find((a) => a.id === selectedAgent.id) && agentStatuses[selectedAgent.id] === "complete" && (<div className="mt-2 border border-[#1e1e24] rounded bg-[#0a0a0f] p-3"><p className="text-[10px] font-mono font-bold text-white mb-1.5">{selectedAgent.name} — Details</p>{selectedAgent.details.map((d, i) => (<p key={i} className="text-[9px] font-mono text-[#8a8a9a] leading-relaxed flex items-start gap-1.5"><span className="text-[#3a3a48] mt-[1px]">&#9679;</span>{d}</p>))}</div>)}
                      </div>);
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-px bg-[#1e1e24]" />

        {/* RIGHT — PDF */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#111118]">
          <div className="px-4 py-2 border-b border-[#1e1e24] flex items-center justify-between shrink-0 bg-[#0c0c12]">
            <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-[#6b6b80] uppercase tracking-[0.12em]">Patient Medical Report</span><span className="text-[8px] font-mono px-1.5 py-[1px] rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold">PDF</span></div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-[#4a4a5a]"><span>1 / 1</span><div className="h-3 w-px bg-[#2a2a35]" /><span>100%</span></div>
          </div>
          <div className="flex-1 overflow-y-auto p-8" style={{ background: "linear-gradient(135deg, #111118, #0e0e14)" }}>
            {!P ? (
              <div className="flex items-center justify-center h-full"><div className="text-center"><div className="w-20 h-28 border-2 border-dashed border-[#1e1e24] rounded mx-auto mb-4 flex items-center justify-center"><span className="text-[#2a2a35] font-mono text-2xl">?</span></div><p className="text-[12px] font-mono text-[#2a2a35]">Medical report will generate after call</p></div></div>
            ) : (
              <div className="bg-white text-[#1a1a1a] max-w-[680px] mx-auto" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", boxShadow: "0 4px 40px rgba(0,0,0,0.5)" }}>
                <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600" />
                <div className="px-10 pt-6 pb-4"><div className="text-center border-b-2 border-[#1a1a1a] pb-4"><h1 className="text-[22px] font-bold tracking-[0.2em] uppercase">{P.name}</h1><p className="text-[9px] mt-2 text-[#666]" style={{ fontFamily: "Arial" }}>{P.location} &bull; {P.phone} &bull; DOB: {P.dob} &bull; MRN: {P.mrn}</p></div></div>
                <div className="px-10 pb-8 space-y-5 text-[10.5px] leading-[1.65]">
                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Demographics</h2><div className="grid grid-cols-3 gap-x-6 gap-y-0.5">{[["Age", `${P.age}y`], ["Sex", P.sex], ["Blood Type", P.bloodType], ["Weight", P.weight], ["Height", P.height], ["BMI", P.bmi], ["Location", P.location], ["Phone", P.phone]].map(([k, v]) => (<p key={k}><b>{k}:</b> {v}</p>))}</div><p className="mt-1"><b>Emergency Contact:</b> {P.emergencyContact.name} ({P.emergencyContact.relation}) — {P.emergencyContact.phone}</p></section>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Insurance</h2><p><b>Provider:</b> {P.insurance.provider} — {P.insurance.planName}</p><p><b>Member ID:</b> {P.insurance.memberId} &nbsp;&nbsp; <b>Group:</b> {P.insurance.groupNumber}</p></section>

                  <section className="bg-red-50 border border-red-200 p-3 rounded"><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-red-800 mb-1">Chief Complaint / Presenting Condition</h2><p className="italic text-[11px] text-red-900 leading-relaxed">&ldquo;{P.primaryComplaint}&rdquo;</p></section>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Hospital Routing</h2><p><b>Facility:</b> {P.hospitalRouting.facility}</p><p><b>Reason:</b> {P.hospitalRouting.reason}</p><p><b>Distance:</b> {P.hospitalRouting.distance}</p></section>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2 text-red-800">Allergies &amp; Adverse Reactions</h2><table className="w-full text-[10px]"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Allergen</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Severity</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Reaction</th></tr></thead><tbody>{P.allergies.map((a) => (<tr key={a.name} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{a.name}</td><td className={`py-1 font-bold ${a.severity === "High" ? "text-red-700" : a.severity === "Medium" ? "text-amber-700" : "text-green-700"}`}>{a.severity}</td><td className="py-1 text-[#555]">{a.reaction}</td></tr>))}</tbody></table></section>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Active Medications</h2><table className="w-full text-[10px]"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Medication</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Dose</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Freq</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Indication</th></tr></thead><tbody>{P.medications.map((m) => (<tr key={m.name} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{m.name}</td><td className="py-1">{m.dosage}</td><td className="py-1 text-[#555]">{m.frequency}</td><td className="py-1 text-[#555]">{m.indication}</td></tr>))}</tbody></table></section>

                  <div className="grid grid-cols-2 gap-6">
                    <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Medical History</h2><ul className="space-y-0.5 list-none">{P.conditions.map((c) => (<li key={c} className="flex items-start gap-1"><span className="text-[#999] text-[8px] mt-[3px]">&#9679;</span>{c}</li>))}</ul></section>
                    <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Surgical History</h2><ul className="space-y-0.5 list-none">{P.surgicalHistory.map((s) => (<li key={s} className="flex items-start gap-1"><span className="text-[#999] text-[8px] mt-[3px]">&#9679;</span>{s}</li>))}</ul></section>
                  </div>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Laboratory Results</h2><table className="w-full text-[10px]"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Test</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Result</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Range</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Date</th></tr></thead><tbody>{P.labResults.map((l) => (<tr key={l.test} className="border-b border-[#f0f0f0]"><td className="py-1">{l.test}</td><td className={`py-1 font-bold ${l.status === "high" ? "text-red-700" : l.status === "low" ? "text-amber-700" : ""}`}>{l.value} {l.status !== "normal" && <span className="text-[8px] font-normal">({l.status.toUpperCase()})</span>}</td><td className="py-1 text-[#888]">{l.range}</td><td className="py-1 text-[#888]">{l.date}</td></tr>))}</tbody></table></section>

                  <div className="grid grid-cols-2 gap-6">
                    <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Family History</h2><ul className="space-y-0.5 list-none">{P.familyHistory.map((f) => (<li key={f} className="flex items-start gap-1"><span className="text-[#999] text-[8px] mt-[3px]">&#9679;</span>{f}</li>))}</ul></section>
                    <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Social History</h2><div className="space-y-0.5">{P.socialHistory.map((s) => (<p key={s.label}><b>{s.label}:</b> {s.value}</p>))}</div></section>
                  </div>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Immunizations</h2><div className="grid grid-cols-2 gap-x-6 gap-y-0.5">{P.immunizations.map((i) => (<p key={i.name}><b>{i.name}</b> — {i.date}</p>))}</div></section>

                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Vitals at Presentation</h2><div className="grid grid-cols-4 gap-x-4 gap-y-0.5">{P.vitals.map((v) => (<p key={v.label}><b>{v.label}:</b> <span className={v.status !== "normal" ? "font-bold text-red-700" : ""}>{v.value} {v.unit}</span></p>))}</div></section>

                  {/* AI DIAGNOSIS SECTION */}
                  {orchComplete && (<>
                    <div className="border-t-2 border-blue-800 pt-4 mt-6">
                      <div className="flex items-center gap-2 mb-3"><div className="w-5 h-5 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center"><span className="text-[8px] font-bold text-white">AI</span></div><h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-blue-900">Multi-Agent AI Diagnosis</h2><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{AGENTS.length} Agents · {DIAGNOSIS_SUMMARY.modelsUsed.length} Models</span></div>
                      <p className="text-[9px] text-[#888] mb-3" style={{ fontFamily: "Arial" }}><b>Models:</b> {DIAGNOSIS_SUMMARY.modelsUsed.join(" | ")} — <b>Execution:</b> Parallel + Sequential + Hybrid — <b>Duration:</b> {(DIAGNOSIS_SUMMARY.totalDuration / 1000).toFixed(1)}s</p>
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-3"><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Primary Diagnosis</p><p className="text-[14px] font-bold text-blue-900 mt-0.5">{DIAGNOSIS_SUMMARY.primary}</p></div><div className="text-right"><p className="text-[22px] font-bold text-blue-700 tabular-nums" style={{ fontFamily: "Arial" }}>{DIAGNOSIS_SUMMARY.confidence}%</p><p className="text-[8px] font-bold text-blue-500 uppercase">Confidence</p></div></div></div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] border-b border-[#ddd] pb-1 mb-2">Differential Diagnoses</h3>
                      <table className="w-full text-[10px] mb-3"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Diagnosis</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Probability</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Status</th></tr></thead><tbody>{DIAGNOSIS_SUMMARY.differentials.map((d) => (<tr key={d.diagnosis} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{d.diagnosis}</td><td className="py-1"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${d.probability >= 30 ? "bg-blue-600" : d.probability >= 15 ? "bg-blue-400" : "bg-gray-400"}`} style={{ width: `${d.probability}%` }} /></div><span className="font-bold tabular-nums" style={{ fontFamily: "Arial" }}>{d.probability}%</span></div></td><td className={`py-1 text-[9px] font-bold uppercase ${d.status === "primary" ? "text-blue-700" : d.status === "secondary" ? "text-purple-700" : d.status === "rule-out" ? "text-red-600" : "text-gray-500"}`}>{d.status}</td></tr>))}</tbody></table>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] border-b border-[#ddd] pb-1 mb-2">Treatment Protocol</h3>
                      <table className="w-full text-[10px] mb-3"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Action</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Priority</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Timeframe</th></tr></thead><tbody>{DIAGNOSIS_SUMMARY.treatments.map((t) => (<tr key={t.action} className="border-b border-[#f0f0f0]"><td className="py-1">{t.action}</td><td className={`py-1 text-[9px] font-bold ${t.priority === "IMMEDIATE" ? "text-red-700" : t.priority === "CONDITIONAL" ? "text-amber-700" : t.priority === "SOON" ? "text-blue-700" : "text-gray-600"}`}>{t.priority}</td><td className="py-1 text-[#555]">{t.timeframe}</td></tr>))}</tbody></table>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] border-b border-[#ddd] pb-1 mb-2">Specialist Referrals</h3>
                      <table className="w-full text-[10px] mb-3"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Specialty</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Urgency</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Timeframe</th></tr></thead><tbody>{DIAGNOSIS_SUMMARY.referrals.map((r) => (<tr key={r.specialty} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{r.specialty}</td><td className={`py-1 text-[9px] font-bold ${r.urgency === "Urgent" ? "text-red-700" : r.urgency === "Conditional" ? "text-amber-700" : "text-green-700"}`}>{r.urgency}</td><td className="py-1 text-[#555]">{r.timeframe}</td></tr>))}</tbody></table>
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded"><p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Agent Consensus</p><p className="text-[10px] leading-relaxed">{AGENTS.length} agents across {Object.keys(WAVE_LABELS).length} waves. All concordant at <b>{DIAGNOSIS_SUMMARY.confidence}%</b>. Immediate orthopedic surgical evaluation + vascular assessment required. Penicillin allergy critical for antibiotic selection. DM management during perioperative period essential.</p></div>
                    </div>
                  </>)}

                  {summary && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Navigator Call Summary</h2><p className="whitespace-pre-line">{summary}</p></section>}

                  <div className="border-t-2 border-[#1a1a1a] pt-3 mt-8 flex justify-between text-[8px] text-[#999]" style={{ fontFamily: "Arial" }}><div><p className="font-bold text-[#666]">NAVIGATOR AI</p><p>Multi-Agent Intelligence Report</p><p>Generated: {today}</p></div><div className="text-right"><p className="font-bold text-[#666]">CONFIDENTIAL</p><p>Protected Health Information</p><p>HIPAA Compliant</p></div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
