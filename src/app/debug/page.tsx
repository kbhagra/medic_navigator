"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type TranscriptLine = {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

type Extracted = {
  name: string | null;
  location: string | null;
  situation: string | null;
  urgency: "Low" | "Medium" | "High" | null;
  medicalNotes: string | null;
  actionNeeded: string | null;
};

type Status = "idle" | "active" | "ended";

const STATUS_STYLES: Record<Status, string> = {
  idle: "bg-[#1a1a1a] text-[#555]",
  active: "bg-[#3a2a00] text-[#EF9F27]",
  ended: "bg-[#1a2a3a] text-[#85B7EB]",
};

const STATUS_LABELS: Record<Status, string> = {
  idle: "Idle",
  active: "Call Active",
  ended: "Call Ended",
};

const URGENCY_COLORS: Record<string, string> = {
  Low: "text-[#5DCAA5]",
  Medium: "text-[#EF9F27]",
  High: "text-[#E24B4A]",
};

const FIELDS: Array<{ label: string; key: keyof Extracted }> = [
  { label: "NAME", key: "name" },
  { label: "LOCATION", key: "location" },
  { label: "SITUATION", key: "situation" },
  { label: "URGENCY", key: "urgency" },
  { label: "MEDICAL NOTES", key: "medicalNotes" },
  { label: "ACTION NEEDED", key: "actionNeeded" },
];

export default function DebugPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted>({
    name: null,
    location: null,
    situation: null,
    urgency: null,
    medicalNotes: null,
    actionNeeded: null,
  });
  const [callerPhone, setCallerPhone] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const prevExtracted = useRef<Extracted>(extracted);

  const handleStart = async () => {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/start", { method: "POST" });
      const data = await res.json();

      if (data.error) {
        setError(data.detail || data.error);
        setStarting(false);
        return;
      }

      setStatus("active");
    } catch (err) {
      setError(String(err));
    } finally {
      setStarting(false);
    }
  };

  const handleReset = async () => {
    await fetch("/api/reset", { method: "POST" });
    setStatus("idle");
    setTranscript([]);
    setSummary(null);
    setExtracted({
      name: null,
      location: null,
      situation: null,
      urgency: null,
      medicalNotes: null,
      actionNeeded: null,
    });
    setError(null);
    prevExtracted.current = {
      name: null,
      location: null,
      situation: null,
      urgency: null,
      medicalNotes: null,
      actionNeeded: null,
    };
  };

  // Poll /api/debug
  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/debug");
      const data = await res.json();
      setTranscript(data.transcript || []);
      setSummary(data.summary);
      if (data.callerPhone) setCallerPhone(data.callerPhone);
      if (data.extracted) {
        setExtracted((prev) => {
          // Detect which fields just got populated
          const newFlash = new Set<string>();
          for (const f of FIELDS) {
            const oldVal = prev[f.key];
            const newVal = data.extracted[f.key];
            if (newVal !== null && oldVal !== newVal) {
              newFlash.add(f.key);
            }
          }
          if (newFlash.size > 0) {
            setFlashKeys(newFlash);
            setTimeout(() => setFlashKeys(new Set()), 600);
          }
          return data.extracted;
        });
      }
      if (data.status !== "idle") setStatus(data.status);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (status === "idle") return;

    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [status, poll]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col lg:flex-row">
      {/* Left — Control Panel */}
      <div className="lg:w-[340px] w-full border-b lg:border-b-0 lg:border-r border-[#2a2a2a] p-6 flex flex-col gap-5 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Navigator
          </h1>
          <p className="text-xs text-[#555] font-mono mt-1">Vapi Debug Panel</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono px-3 py-1 border border-[#2a2a2a] ${STATUS_STYLES[status]}`}
          >
            {starting ? "Calling..." : STATUS_LABELS[status]}
          </span>
          {status === "active" && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#EF9F27] rounded-full animate-pulse" />
            </span>
          )}
        </div>

        {/* Phone number display */}
        <div className="p-4 border border-[#2a2a2a] bg-[#0f0f0f]">
          <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-2">
            Target Number
          </p>
          <p className="text-lg font-mono font-bold text-white tracking-wide">
            +1 (669) 310-5333
          </p>
        </div>

        {/* Caller phone */}
        {callerPhone && (
          <div className="p-3 border border-[#2a2a2a] bg-[#0f0f0f]">
            <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-1">
              Caller
            </p>
            <p className="text-sm font-mono text-[#5DCAA5]">
              {callerPhone}
            </p>
          </div>
        )}

        {/* Start / Reset */}
        {status === "idle" ? (
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full py-4 bg-[#5DCAA5] text-[#0a0a0a] font-bold text-sm font-mono border border-[#5DCAA5] hover:bg-[#4bb892] transition-colors disabled:opacity-50"
          >
            {starting ? "Initiating call..." : "Call +1 (669) 310-5333"}
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="w-full py-2 text-xs font-mono text-[#555] border border-[#2a2a2a] hover:text-white hover:border-[#555] transition-colors"
          >
            Reset
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 border border-red-900 bg-red-900/20 text-red-400 text-xs font-mono break-all">
            {error}
          </div>
        )}

        {/* Webhook reminder */}
        <div className="mt-auto text-[10px] font-mono text-[#333] leading-relaxed">
          <p>Webhook URL:</p>
          <p className="text-[#555] mt-1">/api/webhook</p>
        </div>
      </div>

      {/* Right — Debug Panel */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Live Transcript — 35% */}
        <div className="flex-[35] flex flex-col border-b border-[#2a2a2a] min-h-0">
          <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-[0.12em]">
              Live Transcript
            </span>
            {status === "active" && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#EF9F27] rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-[#EF9F27]">
                  STREAMING
                </span>
              </span>
            )}
          </div>
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto p-4 bg-[#0f0f0f] font-mono text-[13px] leading-relaxed space-y-1.5"
          >
            {transcript.length === 0 ? (
              <p className="text-[#333] italic">Waiting for call...</p>
            ) : (
              transcript.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.role === "user"
                      ? "text-[#EF9F27]"
                      : "text-[#5DCAA5]"
                  }
                >
                  <span className="text-[#555]">[{line.role}]</span>{" "}
                  {line.text}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Extracted Info — 30% */}
        <div className="flex-[30] flex flex-col border-b border-[#2a2a2a] min-h-0">
          <div className="px-4 py-2 border-b border-[#1a1a1a] shrink-0">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-[0.12em]">
              Extracted Patient Info
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#0f0f0f]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {FIELDS.map((f) => {
                const value = extracted[f.key];
                const isFlashing = flashKeys.has(f.key);
                const isUrgency = f.key === "urgency" && value;

                return (
                  <div
                    key={f.key}
                    className={`transition-colors duration-600 rounded px-2 py-1.5 ${
                      isFlashing ? "bg-[#2a3a2a]" : "bg-transparent"
                    }`}
                  >
                    <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-0.5">
                      {f.label}
                    </p>
                    <p
                      className={`text-sm font-mono ${
                        value === null
                          ? "text-[#333]"
                          : isUrgency
                          ? URGENCY_COLORS[value as string] || "text-white"
                          : "text-white"
                      }`}
                    >
                      {value === null ? "\u2014" : String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Call Summary — 35% */}
        <div className="flex-[35] flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-[#1a1a1a] shrink-0">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-[0.12em]">
              Call Summary
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#0f0f0f] font-mono text-[13px] leading-relaxed">
            {summary ? (
              <p className="text-[#85B7EB] whitespace-pre-line">{summary}</p>
            ) : (
              <p className="text-[#333] italic">
                {status === "active"
                  ? "Summary will appear when call ends..."
                  : status === "ended"
                  ? "Generating summary..."
                  : "Summary will appear when call ends"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
