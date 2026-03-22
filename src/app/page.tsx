"use client";

import { useState, useEffect } from "react";

type PatientData = {
  name: string;
  dob: string;
  age: number;
  sex: string;
  mrn: string;
  phone: string;
  location: string;
  bloodType: string;
  weight: string;
  height: string;
  insurance: { provider: string; planName: string; memberId: string; groupNumber: string };
  allergies: { name: string; severity: "High" | "Medium" | "Low"; reaction: string }[];
  medications: { name: string; dosage: string; frequency: string; prescriber: string }[];
  vitals: { label: string; value: string; unit: string; status: "normal" | "warning" | "critical" }[];
  conditions: string[];
  labResults: { test: string; value: string; range: string; status: "normal" | "high" | "low"; date: string }[];
  primaryComplaint: string | null;
  chiefComplaint: string | null;
};

type TranscriptLine = { role: "user" | "assistant"; text: string; timestamp: number };
type Extracted = {
  name: string | null;
  location: string | null;
  situation: string | null;
  urgency: "Low" | "Medium" | "High" | null;
  medicalNotes: string | null;
  actionNeeded: string | null;
};

// Mock patient data for demo
const MOCK_PATIENT: PatientData = {
  name: "Jane Smith",
  dob: "04/12/1989",
  age: 36,
  sex: "Female",
  mrn: "MRN-3E614E",
  phone: "(555) 010-1001",
  location: "Hayward, CA",
  bloodType: "O+",
  weight: "142 lbs",
  height: "5'6\"",
  insurance: {
    provider: "Blue Cross Blue Shield",
    planName: "PPO Gold 500",
    memberId: "BCX-449281",
    groupNumber: "GRP-8812",
  },
  allergies: [
    { name: "Penicillin", severity: "High", reaction: "Anaphylaxis" },
    { name: "Sulfa drugs", severity: "Medium", reaction: "Rash, hives" },
    { name: "Latex", severity: "Low", reaction: "Contact dermatitis" },
    { name: "Ibuprofen", severity: "Medium", reaction: "GI bleeding" },
  ],
  medications: [
    { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescriber: "Dr. Chen" },
    { name: "Metformin", dosage: "500mg", frequency: "Twice daily", prescriber: "Dr. Chen" },
    { name: "Atorvastatin", dosage: "20mg", frequency: "Once daily at bedtime", prescriber: "Dr. Patel" },
    { name: "Albuterol inhaler", dosage: "90mcg", frequency: "As needed", prescriber: "Dr. Ramirez" },
  ],
  vitals: [
    { label: "Blood Pressure", value: "138/88", unit: "mmHg", status: "warning" },
    { label: "Heart Rate", value: "82", unit: "bpm", status: "normal" },
    { label: "Temperature", value: "99.1", unit: "°F", status: "warning" },
    { label: "SpO2", value: "97", unit: "%", status: "normal" },
    { label: "Resp. Rate", value: "18", unit: "/min", status: "normal" },
    { label: "Pain Level", value: "6", unit: "/10", status: "warning" },
  ],
  conditions: [
    "Type 2 Diabetes Mellitus (E11.9)",
    "Essential Hypertension (I10)",
    "Mild intermittent asthma (J45.20)",
    "Hyperlipidemia (E78.5)",
    "Chronic lower back pain (M54.5)",
  ],
  labResults: [
    { test: "HbA1c", value: "7.8%", range: "4.0-5.6%", status: "high", date: "03/10/26" },
    { test: "LDL Cholesterol", value: "142 mg/dL", range: "<100 mg/dL", status: "high", date: "03/10/26" },
    { test: "Creatinine", value: "0.9 mg/dL", range: "0.6-1.2 mg/dL", status: "normal", date: "03/10/26" },
    { test: "TSH", value: "2.4 mIU/L", range: "0.4-4.0 mIU/L", status: "normal", date: "02/15/26" },
    { test: "WBC", value: "11.2 K/uL", range: "4.5-11.0 K/uL", status: "high", date: "03/18/26" },
    { test: "Hemoglobin", value: "13.1 g/dL", range: "12.0-16.0 g/dL", status: "normal", date: "03/18/26" },
  ],
  primaryComplaint: "Severe headache and dizziness since yesterday morning",
  chiefComplaint: null,
};

const SEVERITY_COLORS = {
  High: "text-[#E24B4A] bg-red-900/40 border-red-800",
  Medium: "text-[#EF9F27] bg-amber-900/40 border-amber-800",
  Low: "text-[#5DCAA5] bg-green-900/40 border-green-800",
};

const VITAL_STATUS = {
  normal: "text-[#5DCAA5]",
  warning: "text-[#EF9F27]",
  critical: "text-[#E24B4A]",
};

const LAB_STATUS = {
  normal: "text-[#5DCAA5]",
  high: "text-[#E24B4A]",
  low: "text-[#EF9F27]",
};

// Window panel component
function Panel({ title, badges, children, className = "" }: {
  title: string;
  badges?: { label: string; color: string }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-[#2a2a2a] bg-[#0d0d0d] flex flex-col ${className}`}>
      <div className="px-3 py-1.5 border-b border-[#2a2a2a] flex items-center gap-2 shrink-0 bg-[#111]">
        <span className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest">
          {title}
        </span>
        {badges?.map((b) => (
          <span key={b.label} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${b.color}`}>
            {b.label}
          </span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [patient] = useState<PatientData>(MOCK_PATIENT);
  const [time, setTime] = useState(new Date());
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [extracted, setExtracted] = useState<Extracted>({
    name: null, location: null, situation: null,
    urgency: null, medicalNotes: null, actionNeeded: null,
  });
  const [summary, setSummary] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [memories, setMemories] = useState<string[]>([]);

  // Poll /api/debug for real call data
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/debug");
        const data = await res.json();
        if (data.transcript?.length > 0) setTranscript(data.transcript);
        if (data.summary) setSummary(data.summary);
        if (data.extracted) setExtracted(data.extracted);
        if (data.status) setCallStatus(data.status);
        if (data.patient?.retrieved_memories?.length > 0) {
          setMemories(data.patient.retrieved_memories);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const urgencyBadge = extracted.urgency
    ? SEVERITY_COLORS[extracted.urgency]
    : null;

  return (
    <div className="h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-white tracking-tight font-mono">NAVIGATOR</h1>
          <span className="text-[9px] text-[#555] font-mono uppercase tracking-widest">
            Patient Intelligence Terminal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-[#555]">
            {time.toLocaleTimeString()}
          </span>
          <span className="text-[10px] font-mono text-[#555]">
            {time.toLocaleDateString()}
          </span>
          {callStatus === "active" && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#EF9F27] rounded-full animate-pulse" />
              <span className="text-[9px] text-[#EF9F27] font-mono font-bold">CALL ACTIVE</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[9px] text-green-500 font-mono font-bold">LIVE</span>
          </span>
        </div>
      </header>

      {/* Main content — 2 columns */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT — Case Summary PDF */}
        <div className="w-[420px] shrink-0 border-r border-[#2a2a2a] flex flex-col overflow-y-auto bg-[#0c0c0c]">
          {/* Patient header */}
          <div className="p-4 border-b border-[#2a2a2a] bg-[#111]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white font-mono tracking-tight">
                  {patient.name}
                </h2>
                <p className="text-[10px] font-mono text-[#555] mt-0.5">
                  {patient.mrn} &middot; {patient.dob} &middot; {patient.age}y {patient.sex}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-white font-bold">{patient.bloodType}</p>
                <p className="text-[10px] font-mono text-[#555]">Blood Type</p>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] font-mono text-[#666]">{patient.phone}</span>
              <span className="text-[10px] font-mono text-[#666]">{patient.location}</span>
            </div>
            {extracted.urgency && (
              <div className="mt-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 border ${urgencyBadge}`}>
                  URGENCY: {extracted.urgency}
                </span>
              </div>
            )}
          </div>

          {/* Case Summary Document */}
          <div className="p-4 space-y-4 flex-1">
            {/* Chief Complaint */}
            <div>
              <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1">Chief Complaint</p>
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-3">
                <p className="text-sm font-mono text-[#EF9F27] leading-relaxed">
                  {extracted.situation || patient.primaryComplaint || "Awaiting intake call..."}
                </p>
              </div>
            </div>

            {/* Vitals Summary */}
            <div>
              <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1">Vitals</p>
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-3">
                <div className="grid grid-cols-3 gap-2">
                  {patient.vitals.map((v) => (
                    <div key={v.label}>
                      <p className="text-[9px] font-mono text-[#555]">{v.label}</p>
                      <p className={`text-sm font-mono font-bold ${VITAL_STATUS[v.status]}`}>
                        {v.value}
                        <span className="text-[9px] text-[#555] font-normal ml-1">{v.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div>
              <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1">Insurance</p>
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-3 space-y-1">
                <p className="text-xs font-mono text-white">{patient.insurance.provider}</p>
                <p className="text-[10px] font-mono text-[#888]">{patient.insurance.planName}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] font-mono text-[#555]">
                    ID: <span className="text-[#888]">{patient.insurance.memberId}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#555]">
                    Group: <span className="text-[#888]">{patient.insurance.groupNumber}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div>
              <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1">Medical History</p>
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-3 space-y-1.5">
                {patient.conditions.map((c) => (
                  <div key={c} className="flex items-start gap-2">
                    <span className="text-[9px] text-[#555] mt-0.5">&#9679;</span>
                    <p className="text-[11px] font-mono text-[#ccc] leading-relaxed">{c}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Call Summary (when available) */}
            {summary && (
              <div>
                <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1">Call Summary</p>
                <div className="bg-[#0f0f0f] border border-[#1a3a2a] p-3">
                  <p className="text-[11px] font-mono text-[#85B7EB] leading-relaxed whitespace-pre-line">
                    {summary}
                  </p>
                </div>
              </div>
            )}

            {/* Action Needed */}
            {extracted.actionNeeded && (
              <div>
                <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1">Action Needed</p>
                <div className="bg-[#1a1a0a] border border-[#3a3a1a] p-3">
                  <p className="text-[11px] font-mono text-[#EF9F27] leading-relaxed">
                    {extracted.actionNeeded}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Tiled windows grid */}
        <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-[1px] bg-[#1a1a1a] min-h-0">
          {/* ALLERGIES */}
          <Panel
            title="Allergies"
            badges={[
              { label: "ALERT", color: "bg-red-900/60 text-red-400" },
              { label: `${patient.allergies.length}`, color: "bg-[#1a1a1a] text-[#888]" },
            ]}
          >
            <div className="space-y-2">
              {patient.allergies.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-white font-bold">{a.name}</p>
                    <p className="text-[10px] font-mono text-[#666]">{a.reaction}</p>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${SEVERITY_COLORS[a.severity]}`}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* MEDICATIONS */}
          <Panel
            title="Medications"
            badges={[
              { label: "ACTIVE", color: "bg-green-900/60 text-green-400" },
              { label: `${patient.medications.length}`, color: "bg-[#1a1a1a] text-[#888]" },
            ]}
          >
            <div className="space-y-2">
              {patient.medications.map((m) => (
                <div key={m.name}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-white">{m.name}</p>
                    <p className="text-[10px] font-mono text-[#5DCAA5]">{m.dosage}</p>
                  </div>
                  <p className="text-[10px] font-mono text-[#555]">{m.frequency} &middot; {m.prescriber}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* LAB RESULTS */}
          <Panel
            title="Lab Results"
            badges={[
              { label: "RECENT", color: "bg-blue-900/60 text-blue-400" },
              { label: `${patient.labResults.length}`, color: "bg-[#1a1a1a] text-[#888]" },
            ]}
          >
            <div className="space-y-1.5">
              {patient.labResults.map((l) => (
                <div key={l.test} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-[#ccc]">{l.test}</p>
                    <p className="text-[9px] font-mono text-[#444]">{l.range}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-mono font-bold ${LAB_STATUS[l.status]}`}>{l.value}</p>
                    <p className="text-[9px] font-mono text-[#444]">{l.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* CALL TRANSCRIPT */}
          <Panel
            title="Call Transcript"
            badges={[
              ...(callStatus === "active"
                ? [{ label: "LIVE", color: "bg-green-900/60 text-green-400" }]
                : []),
              { label: `${transcript.length}`, color: "bg-[#1a1a1a] text-[#888]" },
            ]}
            className="row-span-1"
          >
            {transcript.length === 0 ? (
              <p className="text-[10px] font-mono text-[#333] italic">
                Waiting for call data...
              </p>
            ) : (
              <div className="space-y-1">
                {transcript.slice(-10).map((line, i) => (
                  <p key={i} className={`text-[11px] font-mono leading-relaxed ${
                    line.role === "user" ? "text-[#EF9F27]" : "text-[#5DCAA5]"
                  }`}>
                    <span className="text-[#444]">[{line.role}]</span> {line.text}
                  </p>
                ))}
              </div>
            )}
          </Panel>

          {/* EXTRACTED INFO */}
          <Panel
            title="Extracted Info"
            badges={[
              ...(extracted.urgency
                ? [{ label: extracted.urgency, color: SEVERITY_COLORS[extracted.urgency] }]
                : []),
              { label: "GEMINI", color: "bg-purple-900/60 text-purple-400" },
            ]}
          >
            <div className="space-y-2">
              {[
                { label: "NAME", value: extracted.name },
                { label: "LOCATION", value: extracted.location },
                { label: "SITUATION", value: extracted.situation },
                { label: "MEDICAL NOTES", value: extracted.medicalNotes },
                { label: "ACTION NEEDED", value: extracted.actionNeeded },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">{field.label}</p>
                  <p className={`text-[11px] font-mono ${field.value ? "text-white" : "text-[#2a2a2a]"}`}>
                    {field.value || "\u2014"}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          {/* MEM[V] HISTORY */}
          <Panel
            title="Mem[v] History"
            badges={[
              { label: "AI MEMORY", color: "bg-cyan-900/60 text-cyan-400" },
              { label: `${memories.length}`, color: "bg-[#1a1a1a] text-[#888]" },
            ]}
          >
            {memories.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-[#333] italic">
                  Patient memory will load after call processing...
                </p>
                {/* Show mock history entries */}
                {[
                  "Last visit: 02/28/26 — follow-up for hypertension management",
                  "Prescribed Lisinopril 10mg, uptitrated from 5mg",
                  "HbA1c trending up — discussed dietary modifications",
                  "Patient reports compliance with medication regimen",
                  "Referred to endocrinology for diabetes management",
                  "Insurance pre-auth obtained for continuous glucose monitor",
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-cyan-800 mt-0.5">&#9679;</span>
                    <p className="text-[10px] font-mono text-[#666] leading-relaxed">{m}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-cyan-400 mt-0.5">&#9679;</span>
                    <p className="text-[10px] font-mono text-[#ccc] leading-relaxed">{m}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* VITAL SIGNS TRENDS */}
          <Panel
            title="Vital Signs"
            badges={[
              { label: "LIVE", color: "bg-green-900/60 text-green-400" },
            ]}
          >
            <div className="space-y-2">
              {patient.vitals.map((v) => (
                <div key={v.label} className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-[#666]">{v.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-mono font-bold ${VITAL_STATUS[v.status]}`}>
                      {v.value}
                    </span>
                    <span className="text-[9px] font-mono text-[#444]">{v.unit}</span>
                    {v.status === "warning" && (
                      <span className="text-[9px] text-[#EF9F27]">&#9650;</span>
                    )}
                    {v.status === "critical" && (
                      <span className="text-[9px] text-[#E24B4A]">&#9650;&#9650;</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* ROUTING / STATUS */}
          <Panel
            title="Patient Routing"
            badges={[
              { label: callStatus === "active" ? "IN PROGRESS" : callStatus === "complete" ? "COMPLETE" : "PENDING",
                color: callStatus === "active" ? "bg-amber-900/60 text-amber-400"
                  : callStatus === "complete" ? "bg-green-900/60 text-green-400"
                  : "bg-[#1a1a1a] text-[#555]" },
            ]}
          >
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">Status</p>
                <p className="text-sm font-mono text-white font-bold capitalize">{callStatus}</p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">Triage Level</p>
                <p className={`text-sm font-mono font-bold ${
                  extracted.urgency === "High" ? "text-[#E24B4A]"
                  : extracted.urgency === "Medium" ? "text-[#EF9F27]"
                  : extracted.urgency === "Low" ? "text-[#5DCAA5]"
                  : "text-[#333]"
                }`}>
                  {extracted.urgency || "Pending assessment"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">Location</p>
                <p className="text-xs font-mono text-[#888]">{extracted.location || patient.location}</p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">Primary Provider</p>
                <p className="text-xs font-mono text-[#888]">Dr. James Chen, MD</p>
                <p className="text-[10px] font-mono text-[#555]">Internal Medicine</p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">APIs Used</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {["Vapi", "Gemini", "Mem[v]", "ElevenLabs"].map((api) => (
                    <span key={api} className="text-[9px] font-mono px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#666]">
                      {api}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* ENCOUNTERS / CALL LOG */}
          <Panel
            title="Recent Encounters"
            badges={[
              { label: "HISTORY", color: "bg-[#1a1a1a] text-[#888]" },
            ]}
          >
            <div className="space-y-2">
              {[
                { date: "03/18/26", type: "ER Visit", reason: "Severe headache, dizziness", outcome: "Admitted for observation", status: "escalated" as const },
                { date: "02/28/26", type: "Follow-up", reason: "Hypertension management", outcome: "Lisinopril adjusted", status: "approved" as const },
                { date: "02/10/26", type: "Lab Work", reason: "Routine metabolic panel", outcome: "HbA1c elevated", status: "follow-up" as const },
                { date: "01/15/26", type: "Referral", reason: "Endocrinology consult", outcome: "Appointment scheduled", status: "approved" as const },
                { date: "12/20/25", type: "Urgent Care", reason: "Asthma exacerbation", outcome: "Nebulizer treatment", status: "approved" as const },
              ].map((enc) => {
                const colors = {
                  approved: "text-green-400 bg-green-900/40 border-green-800",
                  escalated: "text-red-400 bg-red-900/40 border-red-800",
                  "follow-up": "text-amber-400 bg-amber-900/40 border-amber-800",
                };
                return (
                  <div key={enc.date} className="border-b border-[#1a1a1a] pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#555]">{enc.date}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${colors[enc.status]}`}>
                        {enc.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-white mt-0.5">{enc.type}: {enc.reason}</p>
                    <p className="text-[10px] font-mono text-[#666]">{enc.outcome}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
