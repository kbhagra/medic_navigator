"use client";

import { useState, useEffect, useCallback } from "react";
import { AGENTS, WAVE_LABELS, type AgentDef } from "@/lib/agents";

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

type AgentResult = {
  id: string; name: string; model: string; wave: number; type: string;
  confidence: number; finding: string; details: string[]; duration: number;
  status: "pending" | "running" | "complete" | "error";
};

type DiagnosisSummary = {
  primary: string; confidence: number; riskLevel: string;
  differentials: { diagnosis: string; probability: number; status: string }[];
  treatments: { action: string; priority: string; timeframe: string }[];
  referrals: { specialty: string; urgency: string; timeframe: string }[];
  agentCount: number; modelsUsed: string[]; totalDuration: number;
};

type Procedure = { title: string; source: string; desc: string; details: string[] };
type Cause = { title: string; items: string[] };

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

function AgentCard({ agent, result }: { agent: AgentDef; result?: AgentResult }) {
  const status = result?.status || "pending";
  return (
    <div className={`border rounded px-2.5 py-2 transition-all duration-500 ${status === "complete" ? "border-[#1e2e24] bg-[#0a120e]" : status === "running" ? "border-amber-800/40 bg-amber-950/20" : "border-[#1a1a22] bg-[#0a0a0f]"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {status === "pending" && <span className="w-[6px] h-[6px] rounded-full border border-[#3a3a48]" />}
          {status === "running" && <span className="w-[6px] h-[6px] rounded-full bg-amber-500 animate-pulse" />}
          {status === "complete" && <span className="text-emerald-400 text-[10px]">&#10003;</span>}
          <span className={`text-[10px] font-mono font-semibold ${status === "complete" ? "text-[#b0b0c0]" : status === "running" ? "text-white" : "text-[#4a4a5a]"}`}>{agent.name}</span>
        </div>
        {status === "complete" && result && <span className={`text-[9px] font-mono font-bold tabular-nums ${result.confidence >= 95 ? "text-emerald-400" : result.confidence >= 90 ? "text-cyan-400" : "text-amber-400"}`}>{result.confidence}%</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[7px] font-mono px-1 py-[0px] rounded border ${agent.model.includes("Perplexity") || agent.model.includes("sonar") ? "bg-blue-900/30 text-blue-400 border-blue-800/40" : "bg-[#12121a] text-[#5a5a6a] border-[#1e1e24]"}`}>{agent.model}</span>
        {result && result.duration > 0 && <span className="text-[7px] font-mono text-[#3a3a48]">{result.duration}ms</span>}
      </div>
      {status === "complete" && result && <p className="text-[9px] font-mono text-[#6a6a7a] mt-1.5 leading-relaxed line-clamp-2">{result.finding}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

export default function Home() {
  const [time, setTime] = useState(new Date());
  const [tab, setTab] = useState<"panels" | "agents">("panels");
  const [procIdx, setProcIdx] = useState(0);
  const [causeIdx, setCauseIdx] = useState(0);

  // All state starts empty — populated via polling
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [extracted, setExtracted] = useState<Extracted>({ name: null, location: null, situation: null, urgency: null, medicalNotes: null, actionNeeded: null });
  const [summary, setSummary] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [diagnosisSummary, setDiagnosisSummary] = useState<DiagnosisSummary | null>(null);
  const [orchStatus, setOrchStatus] = useState("idle");
  const [orchProgress, setOrchProgress] = useState(0);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate procedures every 15s, causes every 10s
  useEffect(() => {
    if (procedures.length === 0 && causes.length === 0) return;
    const p = procedures.length > 0 ? setInterval(() => setProcIdx((i) => (i + 1) % procedures.length), 15000) : null;
    const c = causes.length > 0 ? setInterval(() => setCauseIdx((i) => (i + 1) % causes.length), 10000) : null;
    return () => { if (p) clearInterval(p); if (c) clearInterval(c); };
  }, [procedures.length, causes.length]);

  // Poll /api/debug every 2s
  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/debug");
      if (!res.ok) return;
      const data = await res.json();

      if (data.transcript?.length > 0) setTranscript(data.transcript);
      if (data.extracted) setExtracted(data.extracted);
      if (data.summary) setSummary(data.summary);
      if (data.status) setCallStatus(data.status);

      // Patient document from Gemini becomes the PatientData for rendering
      if (data.patientDocument) {
        setPatient(data.patientDocument as PatientData);
      }

      if (data.agentResults?.length > 0) setAgentResults(data.agentResults);
      if (data.diagnosisSummary) setDiagnosisSummary(data.diagnosisSummary);
      if (data.orchestrationStatus) setOrchStatus(data.orchestrationStatus);
      if (data.orchestrationProgress !== undefined) setOrchProgress(data.orchestrationProgress);
      if (data.procedures?.length > 0) setProcedures(data.procedures);
      if (data.causes?.length > 0) setCauses(data.causes);
    } catch {
      // Polling error, will retry
    }
  }, []);

  useEffect(() => {
    poll(); // Initial fetch
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const orchRunning = orchStatus === "running";
  const orchComplete = orchStatus === "complete";
  const today = time.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const completedCount = agentResults.filter((a) => a.status === "complete").length;
  const agentMap = new Map(agentResults.map((r) => [r.id, r]));
  const P = patient;

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
              /* EMPTY STATE */
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
              /* FULL PANELS */
              <div className="flex-1 grid grid-cols-3 grid-rows-3 min-h-0" style={{ gap: "1px", background: "#1e1e24" }}>
                <Panel title="Vitals" badge="LIVE" bc="bg-emerald-500/15 text-emerald-400 border-emerald-500/25" count={P.vitals?.length}>
                  {P.vitals?.length > 0 ? (
                    <div className="space-y-[4px]">{P.vitals.map((v) => (<div key={v.label} className="flex items-center justify-between"><span className="text-[10px] font-mono text-[#5a5a6a]">{v.label}</span><div className="flex items-center gap-1"><span className={`text-[13px] font-mono font-bold tabular-nums ${VS[v.status] || "text-[#9090a0]"}`}>{v.value}</span><span className="text-[8px] font-mono text-[#3a3a48]">{v.unit}</span>{v.status !== "normal" && <span className={`w-1.5 h-1.5 rounded-full ${v.status === "warning" ? "bg-amber-500" : "bg-red-500"}`} />}</div></div>))}</div>
                  ) : <p className="text-[10px] font-mono text-[#2a2a35] italic">No vitals data</p>}
                </Panel>
                <Panel title="Allergies" badge="ALERT" bc="bg-red-500/15 text-red-400 border-red-500/25" count={P.allergies?.length}>
                  {P.allergies?.length > 0 ? (
                    <div className="space-y-1.5">{P.allergies.map((a) => (<div key={a.name}><div className="flex items-center justify-between"><span className="text-[11px] font-mono text-white font-semibold">{a.name}</span><span className={`text-[7px] font-mono font-bold px-1 py-[0px] rounded border ${SEV[a.severity]?.badge || "bg-[#1a1a22] text-[#6b6b80] border-[#2a2a35]"}`}>{a.severity?.toUpperCase()}</span></div><p className="text-[9px] font-mono text-[#4a4a5a]">{a.reaction}</p></div>))}</div>
                  ) : <p className="text-[10px] font-mono text-[#2a2a35] italic">No allergies recorded</p>}
                </Panel>
                <Panel title="Medications" badge="ACTIVE" bc="bg-emerald-500/15 text-emerald-400 border-emerald-500/25" count={P.medications?.length}>
                  {P.medications?.length > 0 ? (
                    <div className="space-y-1.5">{P.medications.map((m) => (<div key={m.name}><div className="flex items-center justify-between"><span className="text-[11px] font-mono text-white">{m.name}</span><span className="text-[10px] font-mono font-bold text-cyan-400">{m.dosage}</span></div><p className="text-[9px] font-mono text-[#4a4a5a]">{m.frequency} · {m.indication}</p></div>))}</div>
                  ) : <p className="text-[10px] font-mono text-[#2a2a35] italic">No medications</p>}
                </Panel>
                <Panel title="Labs" badge="RECENT" bc="bg-blue-500/15 text-blue-400 border-blue-500/25" count={P.labResults?.length}>
                  {P.labResults?.length > 0 ? (
                    <div className="space-y-[3px]">{P.labResults.map((l) => (<div key={l.test} className="flex items-center justify-between"><div><span className="text-[10px] font-mono text-[#9090a0]">{l.test}</span><span className="text-[7px] font-mono text-[#3a3a48] ml-1">{l.range}</span></div><div className="flex items-center gap-1"><span className={`text-[11px] font-mono font-bold tabular-nums ${LS[l.status] || "text-[#9090a0]"}`}>{l.value}</span>{l.status !== "normal" && <span className={`text-[7px] font-mono font-bold px-1 rounded ${l.status === "high" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>{l.status === "high" ? "H" : "L"}</span>}</div></div>))}</div>
                  ) : <p className="text-[10px] font-mono text-[#2a2a35] italic">No lab results</p>}
                </Panel>
                <Panel title="Transcript" badge={transcript.length > 0 ? "COMPLETE" : "WAITING"} bc={transcript.length > 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : undefined} count={transcript.length}>
                  {transcript.length === 0 ? <p className="text-[10px] font-mono text-[#2a2a35] italic">No transcript data</p> : <div className="space-y-1">{transcript.slice(-12).map((line, i) => (<p key={i} className="text-[10px] font-mono leading-relaxed"><span className={`font-bold ${line.role === "user" ? "text-amber-400" : "text-emerald-400"}`}>{line.role === "user" ? "USR" : "AGT"}</span><span className="text-[#3a3a48] mx-1">|</span><span className="text-[#9090a0]">{line.text}</span></p>))}</div>}
                </Panel>
                <Panel title="Extracted" badge={extracted.urgency || "GEMINI"} bc={extracted.urgency ? SEV[extracted.urgency]?.badge : "bg-purple-500/15 text-purple-400 border-purple-500/25"}>
                  <div className="space-y-1.5">{[{ l: "NAME", v: extracted.name }, { l: "LOCATION", v: extracted.location }, { l: "SITUATION", v: extracted.situation }, { l: "MED NOTES", v: extracted.medicalNotes }, { l: "ACTION", v: extracted.actionNeeded }].map((f) => (<div key={f.l}><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">{f.l}</p><p className={`text-[10px] font-mono ${f.v ? "text-white" : "text-[#1e1e24]"}`}>{f.v || "\u2014"}</p></div>))}</div>
                </Panel>
                <Panel title="Procedures" badge={procedures.length > 0 ? "LIVE" : "WAITING"} bc={procedures.length > 0 ? "bg-orange-500/15 text-orange-400 border-orange-500/25" : undefined}>
                  {procedures.length === 0 ? <p className="text-[10px] font-mono text-[#2a2a35] italic">Procedures will populate after orchestration...</p> : (() => { const proc = procedures[procIdx % procedures.length]; return (<div className="space-y-1.5">
                    <p className="text-[11px] font-mono text-white font-semibold leading-tight">{proc.title}</p>
                    {proc.source && <div className="flex items-center gap-1.5"><span className="text-[7px] font-mono px-1 py-[0px] rounded bg-orange-500/15 border border-orange-500/25 text-orange-400">SRC</span><span className="text-[8px] font-mono text-[#5a5a6a]">{proc.source}</span></div>}
                    <p className="text-[9px] font-mono text-[#8a8a9a] leading-relaxed">{proc.desc}</p>
                    {proc.details?.length > 0 && <div className="space-y-0.5">{proc.details.map((d, i) => (<div key={i} className="flex items-start gap-1"><span className="text-[#4a4a5a] text-[7px] mt-[3px]">&#9679;</span><p className="text-[8px] font-mono text-[#6a6a7a] leading-relaxed">{d}</p></div>))}</div>}
                    <p className="text-[7px] font-mono text-[#2a2a35] mt-1">Auto-refreshing · {(procIdx % procedures.length) + 1}/{procedures.length}</p>
                  </div>); })()}
                </Panel>
                <Panel title="Routing" badge={P.hospitalRouting?.facility ? "TRAUMA" : "PENDING"} bc="bg-red-500/15 text-red-400 border-red-500/25">
                  {P.hospitalRouting ? (
                    <div className="space-y-2">
                      <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">FACILITY</p><p className="text-[10px] font-mono font-semibold text-white">{P.hospitalRouting.facility}</p></div>
                      <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">REASON</p><p className="text-[9px] font-mono text-[#8a8a9a]">{P.hospitalRouting.reason}</p></div>
                      <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">DISTANCE</p><p className="text-[10px] font-mono text-amber-400">{P.hospitalRouting.distance}</p></div>
                      <div><p className="text-[8px] font-mono text-[#3a3a48] uppercase tracking-[0.15em]">APIS</p><div className="flex gap-1 mt-1 flex-wrap">{["Vapi", "Gemini", "Perplexity", "Mem[v]", "ElevenLabs"].map((a) => (<span key={a} className="text-[7px] font-mono px-1 py-[0px] rounded bg-[#12121a] border border-[#1e1e24] text-[#5a5a6a]">{a}</span>))}</div></div>
                    </div>
                  ) : <p className="text-[10px] font-mono text-[#2a2a35] italic">Routing will populate after analysis...</p>}
                </Panel>
                <Panel title="Possible Causes" badge={causes.length > 0 ? "ANALYSIS" : "WAITING"} bc={causes.length > 0 ? "bg-violet-500/15 text-violet-400 border-violet-500/25" : undefined}>
                  {causes.length === 0 ? <p className="text-[10px] font-mono text-[#2a2a35] italic">Causes will populate after orchestration...</p> : (() => { const cause = causes[causeIdx % causes.length]; return (<div className="space-y-1.5">
                    <p className="text-[11px] font-mono text-white font-semibold leading-tight">{cause.title}</p>
                    {cause.items?.length > 0 && <div className="space-y-0.5">{cause.items.map((item, i) => (<div key={i} className="flex items-start gap-1"><span className="text-violet-600 text-[7px] mt-[3px]">&#9679;</span><p className="text-[9px] font-mono text-[#8a8a9a] leading-relaxed">{item}</p></div>))}</div>}
                    <p className="text-[7px] font-mono text-[#2a2a35] mt-1">Updating · {(causeIdx % causes.length) + 1}/{causes.length}</p>
                  </div>); })()}
                </Panel>
              </div>
            )
          ) : (
            /* AI ANALYSIS VIEW */
            <div className="flex-1 overflow-y-auto bg-[#08080c]">
              {agentResults.length === 0 && !orchRunning ? (
                <div className="flex-1 flex items-center justify-center h-full"><p className="text-[12px] font-mono text-[#2a2a35]">AI analysis will begin after patient call...</p></div>
              ) : (
                <>
                  <div className="px-4 py-3 bg-[#0c0c12] border-b border-[#1e1e24]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-[#6b6b80] uppercase tracking-[0.12em]">Multi-Agent Orchestration</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-[1px] rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">{AGENTS.length} AGENTS</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-[1px] rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">5 WAVES</span>
                        {diagnosisSummary && <span className="text-[8px] font-mono font-bold px-1.5 py-[1px] rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">{diagnosisSummary.modelsUsed.length} MODELS</span>}
                      </div>
                      {orchComplete && diagnosisSummary && <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums">{diagnosisSummary.confidence}% CONFIDENCE</span>}
                    </div>
                    <div className="h-1 bg-[#1a1a22] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${orchProgress}%`, background: orchComplete ? "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)" : "linear-gradient(90deg, #f59e0b, #eab308)" }} /></div>
                    <div className="flex items-center justify-between mt-1.5"><span className="text-[9px] font-mono text-[#4a4a5a]">{completedCount}/{AGENTS.length} complete</span>{orchComplete && diagnosisSummary && <span className="text-[9px] font-mono text-[#4a4a5a]">{(diagnosisSummary.totalDuration / 1000).toFixed(1)}s total</span>}</div>
                  </div>
                  {orchComplete && diagnosisSummary && (
                    <div className="px-4 py-3 bg-[#0a120e] border-b border-emerald-900/30">
                      <div className="flex items-center gap-3 mb-2"><span className="text-emerald-400 text-sm">&#10003;</span><span className="text-[12px] font-mono font-bold text-white">{diagnosisSummary.primary}</span><span className="text-[9px] font-mono font-bold px-1.5 py-[1px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">{diagnosisSummary.riskLevel}</span></div>
                      <div className="flex gap-4 flex-wrap">{diagnosisSummary.differentials.slice(0, 4).map((d) => (<div key={d.diagnosis} className="flex items-center gap-1.5"><div className="w-10 h-1 bg-[#1a1a22] rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${d.probability}%` }} /></div><span className="text-[9px] font-mono text-[#8a8a9a]">{d.diagnosis} <span className="text-cyan-400 font-bold">{d.probability}%</span></span></div>))}</div>
                    </div>
                  )}
                  <div className="p-4 space-y-4">
                    {Object.entries(WAVE_LABELS).map(([wn, wm]) => {
                      const w = Number(wn); const wa = AGENTS.filter((a) => a.wave === w);
                      const waveResults = wa.map((a) => agentMap.get(a.id));
                      const allDone = waveResults.every((r) => r?.status === "complete");
                      const anyRun = waveResults.some((r) => r?.status === "running");
                      return (<div key={w}>
                        <div className="flex items-center gap-2 mb-2"><span className="text-[9px] font-mono font-bold text-[#4a4a5a] uppercase tracking-[0.15em]">Wave {w} — {wm.label}</span><span className={`text-[7px] font-mono font-bold px-1.5 py-[0px] rounded border ${allDone ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : anyRun ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-[#1a1a22] text-[#4a4a5a] border-[#2a2a35]"}`}>{wm.type}</span>{allDone && <span className="text-emerald-400 text-[9px]">&#10003;</span>}{anyRun && <span className="w-[5px] h-[5px] bg-amber-500 rounded-full animate-pulse" />}</div>
                        <div className="grid gap-2 grid-cols-2">{wa.map((agent) => (<div key={agent.id} onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)} className="cursor-pointer"><AgentCard agent={agent} result={agentMap.get(agent.id)} /></div>))}</div>
                        {selectedAgent && wa.find((a) => a.id === selectedAgent.id) && agentMap.get(selectedAgent.id)?.status === "complete" && (<div className="mt-2 border border-[#1e1e24] rounded bg-[#0a0a0f] p-3"><p className="text-[10px] font-mono font-bold text-white mb-1.5">{selectedAgent.name} — Details</p>{agentMap.get(selectedAgent.id)?.details.map((d, i) => (<p key={i} className="text-[9px] font-mono text-[#8a8a9a] leading-relaxed flex items-start gap-1.5"><span className="text-[#3a3a48] mt-[1px]">&#9679;</span>{d}</p>))}</div>)}
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
                  <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Demographics</h2><div className="grid grid-cols-3 gap-x-6 gap-y-0.5">{[["Age", `${P.age}y`], ["Sex", P.sex], ["Blood Type", P.bloodType], ["Weight", P.weight], ["Height", P.height], ["BMI", P.bmi], ["Location", P.location], ["Phone", P.phone]].map(([k, v]) => (<p key={k}><b>{k}:</b> {v}</p>))}</div>{P.emergencyContact && <p className="mt-1"><b>Emergency Contact:</b> {P.emergencyContact.name} ({P.emergencyContact.relation}) — {P.emergencyContact.phone}</p>}</section>

                  {P.insurance && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Insurance</h2><p><b>Provider:</b> {P.insurance.provider} — {P.insurance.planName}</p><p><b>Member ID:</b> {P.insurance.memberId} &nbsp;&nbsp; <b>Group:</b> {P.insurance.groupNumber}</p></section>}

                  {P.primaryComplaint && <section className="bg-red-50 border border-red-200 p-3 rounded"><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-red-800 mb-1">Chief Complaint / Presenting Condition</h2><p className="italic text-[11px] text-red-900 leading-relaxed">&ldquo;{P.primaryComplaint}&rdquo;</p></section>}

                  {P.hospitalRouting && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Hospital Routing</h2><p><b>Facility:</b> {P.hospitalRouting.facility}</p><p><b>Reason:</b> {P.hospitalRouting.reason}</p><p><b>Distance:</b> {P.hospitalRouting.distance}</p></section>}

                  {P.allergies?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2 text-red-800">Allergies &amp; Adverse Reactions</h2><table className="w-full text-[10px]"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Allergen</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Severity</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Reaction</th></tr></thead><tbody>{P.allergies.map((a) => (<tr key={a.name} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{a.name}</td><td className={`py-1 font-bold ${a.severity === "High" ? "text-red-700" : a.severity === "Medium" ? "text-amber-700" : "text-green-700"}`}>{a.severity}</td><td className="py-1 text-[#555]">{a.reaction}</td></tr>))}</tbody></table></section>}

                  {P.medications?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Active Medications</h2><table className="w-full text-[10px]"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Medication</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Dose</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Freq</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Indication</th></tr></thead><tbody>{P.medications.map((m) => (<tr key={m.name} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{m.name}</td><td className="py-1">{m.dosage}</td><td className="py-1 text-[#555]">{m.frequency}</td><td className="py-1 text-[#555]">{m.indication}</td></tr>))}</tbody></table></section>}

                  <div className="grid grid-cols-2 gap-6">
                    {P.conditions?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Medical History</h2><ul className="space-y-0.5 list-none">{P.conditions.map((c) => (<li key={c} className="flex items-start gap-1"><span className="text-[#999] text-[8px] mt-[3px]">&#9679;</span>{c}</li>))}</ul></section>}
                    {P.surgicalHistory?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Surgical History</h2><ul className="space-y-0.5 list-none">{P.surgicalHistory.map((s) => (<li key={s} className="flex items-start gap-1"><span className="text-[#999] text-[8px] mt-[3px]">&#9679;</span>{s}</li>))}</ul></section>}
                  </div>

                  {P.labResults?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Laboratory Results</h2><table className="w-full text-[10px]"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Test</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Result</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Range</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Date</th></tr></thead><tbody>{P.labResults.map((l) => (<tr key={l.test} className="border-b border-[#f0f0f0]"><td className="py-1">{l.test}</td><td className={`py-1 font-bold ${l.status === "high" ? "text-red-700" : l.status === "low" ? "text-amber-700" : ""}`}>{l.value} {l.status !== "normal" && <span className="text-[8px] font-normal">({l.status.toUpperCase()})</span>}</td><td className="py-1 text-[#888]">{l.range}</td><td className="py-1 text-[#888]">{l.date}</td></tr>))}</tbody></table></section>}

                  <div className="grid grid-cols-2 gap-6">
                    {P.familyHistory?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Family History</h2><ul className="space-y-0.5 list-none">{P.familyHistory.map((f) => (<li key={f} className="flex items-start gap-1"><span className="text-[#999] text-[8px] mt-[3px]">&#9679;</span>{f}</li>))}</ul></section>}
                    {P.socialHistory?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Social History</h2><div className="space-y-0.5">{P.socialHistory.map((s) => (<p key={s.label}><b>{s.label}:</b> {s.value}</p>))}</div></section>}
                  </div>

                  {P.immunizations?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Immunizations</h2><div className="grid grid-cols-2 gap-x-6 gap-y-0.5">{P.immunizations.map((i) => (<p key={i.name}><b>{i.name}</b> — {i.date}</p>))}</div></section>}

                  {P.vitals?.length > 0 && <section><h2 className="text-[12px] font-bold uppercase tracking-[0.1em] border-b border-[#ddd] pb-1 mb-2">Vitals at Presentation</h2><div className="grid grid-cols-4 gap-x-4 gap-y-0.5">{P.vitals.map((v) => (<p key={v.label}><b>{v.label}:</b> <span className={v.status !== "normal" ? "font-bold text-red-700" : ""}>{v.value} {v.unit}</span></p>))}</div></section>}

                  {/* AI DIAGNOSIS SECTION */}
                  {orchComplete && diagnosisSummary && (<>
                    <div className="border-t-2 border-blue-800 pt-4 mt-6">
                      <div className="flex items-center gap-2 mb-3"><div className="w-5 h-5 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center"><span className="text-[8px] font-bold text-white">AI</span></div><h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-blue-900">Multi-Agent AI Diagnosis</h2><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{diagnosisSummary.agentCount} Agents · {diagnosisSummary.modelsUsed.length} Models</span></div>
                      <p className="text-[9px] text-[#888] mb-3" style={{ fontFamily: "Arial" }}><b>Models:</b> {diagnosisSummary.modelsUsed.join(" | ")} — <b>Execution:</b> Parallel + Sequential + Hybrid — <b>Duration:</b> {(diagnosisSummary.totalDuration / 1000).toFixed(1)}s</p>
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-3"><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Primary Diagnosis</p><p className="text-[14px] font-bold text-blue-900 mt-0.5">{diagnosisSummary.primary}</p></div><div className="text-right"><p className="text-[22px] font-bold text-blue-700 tabular-nums" style={{ fontFamily: "Arial" }}>{diagnosisSummary.confidence}%</p><p className="text-[8px] font-bold text-blue-500 uppercase">Confidence</p></div></div></div>
                      {diagnosisSummary.differentials.length > 0 && <><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] border-b border-[#ddd] pb-1 mb-2">Differential Diagnoses</h3>
                      <table className="w-full text-[10px] mb-3"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Diagnosis</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Probability</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Status</th></tr></thead><tbody>{diagnosisSummary.differentials.map((d) => (<tr key={d.diagnosis} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{d.diagnosis}</td><td className="py-1"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${d.probability >= 30 ? "bg-blue-600" : d.probability >= 15 ? "bg-blue-400" : "bg-gray-400"}`} style={{ width: `${d.probability}%` }} /></div><span className="font-bold tabular-nums" style={{ fontFamily: "Arial" }}>{d.probability}%</span></div></td><td className={`py-1 text-[9px] font-bold uppercase ${d.status === "primary" ? "text-blue-700" : d.status === "secondary" ? "text-purple-700" : d.status === "rule-out" ? "text-red-600" : "text-gray-500"}`}>{d.status}</td></tr>))}</tbody></table></>}
                      {diagnosisSummary.treatments.length > 0 && <><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] border-b border-[#ddd] pb-1 mb-2">Treatment Protocol</h3>
                      <table className="w-full text-[10px] mb-3"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Action</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Priority</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Timeframe</th></tr></thead><tbody>{diagnosisSummary.treatments.map((t) => (<tr key={t.action} className="border-b border-[#f0f0f0]"><td className="py-1">{t.action}</td><td className={`py-1 text-[9px] font-bold ${t.priority === "IMMEDIATE" ? "text-red-700" : t.priority === "CONDITIONAL" ? "text-amber-700" : t.priority === "SOON" ? "text-blue-700" : "text-gray-600"}`}>{t.priority}</td><td className="py-1 text-[#555]">{t.timeframe}</td></tr>))}</tbody></table></>}
                      {diagnosisSummary.referrals.length > 0 && <><h3 className="text-[11px] font-bold uppercase tracking-[0.08em] border-b border-[#ddd] pb-1 mb-2">Specialist Referrals</h3>
                      <table className="w-full text-[10px] mb-3"><thead><tr className="border-b border-[#e5e5e5] text-[9px] text-[#888]"><th className="text-left py-1 font-semibold uppercase tracking-wider">Specialty</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Urgency</th><th className="text-left py-1 font-semibold uppercase tracking-wider">Timeframe</th></tr></thead><tbody>{diagnosisSummary.referrals.map((r) => (<tr key={r.specialty} className="border-b border-[#f0f0f0]"><td className="py-1 font-semibold">{r.specialty}</td><td className={`py-1 text-[9px] font-bold ${r.urgency === "Urgent" ? "text-red-700" : r.urgency === "Conditional" ? "text-amber-700" : "text-green-700"}`}>{r.urgency}</td><td className="py-1 text-[#555]">{r.timeframe}</td></tr>))}</tbody></table></>}
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded"><p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Agent Consensus</p><p className="text-[10px] leading-relaxed">{diagnosisSummary.agentCount} agents across {Object.keys(WAVE_LABELS).length} waves completed at <b>{diagnosisSummary.confidence}%</b> confidence. Total analysis time: {(diagnosisSummary.totalDuration / 1000).toFixed(1)}s.</p></div>
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
