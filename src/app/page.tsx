"use client";

import { useState, useEffect } from "react";
import {
  MOCK_CALL_LOG,
  MOCK_PATIENT_QUEUE,
  MOCK_WEEKLY_CALLS,
  MOCK_TASK_TYPES,
  MOCK_RECENT_OUTCOMES,
} from "@/lib/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type QueueStatus = "Researching" | "Script ready" | "Calling" | "On hold" | "Resolved";
const QUEUE_STATUSES: QueueStatus[] = ["Researching", "Script ready", "Calling", "On hold", "Resolved"];

type QueueItem = { id: string; name: string; task: string; status: QueueStatus };

const OUTCOME_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  approved: { bg: "bg-green-900/40", text: "text-green-400", border: "border-green-700" },
  "follow-up": { bg: "bg-amber-900/40", text: "text-amber-400", border: "border-amber-700" },
  escalated: { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-700" },
  denied: { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-700" },
  pending: { bg: "bg-yellow-900/40", text: "text-yellow-400", border: "border-yellow-700" },
};

export default function Home() {
  const [callsToday, setCallsToday] = useState(47);
  const [queue, setQueue] = useState<QueueItem[]>(MOCK_PATIENT_QUEUE.map(p => ({ ...p, status: p.status as QueueStatus })));
  const [callLog, setCallLog] = useState(MOCK_CALL_LOG);
  const [time, setTime] = useState(new Date());

  // Live-update simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) setCallsToday((c) => c + 1);

      setQueue((q) =>
        q.map((p) => ({
          ...p,
          status:
            Math.random() > 0.7
              ? QUEUE_STATUSES[Math.floor(Math.random() * QUEUE_STATUSES.length)]
              : p.status,
        }))
      );

      setTime(new Date());
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Add new call log entry every 20s
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ["Alex R.", "Kim T.", "Pat D.", "Sam W.", "Chris M.", "Jordan L."];
      const tasks = ["Prior auth", "Claim appeal", "Referral", "Billing dispute", "Lab auth"];
      const outcomes = ["approved", "follow-up", "escalated"] as const;
      const newEntry = {
        id: `${Date.now()}`,
        patient: names[Math.floor(Math.random() * names.length)],
        task: tasks[Math.floor(Math.random() * tasks.length)],
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
        duration: 120 + Math.floor(Math.random() * 500),
        time: "just now",
        apis: ["Perplexity", "Gemini", "Vapi"],
      };
      setCallLog((log) => [newEntry, ...log.slice(0, 14)]);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white tracking-tight">
            NAVIGATOR
          </h1>
          <span className="text-[10px] text-[#666] font-mono uppercase tracking-widest">
            Hospital Intelligence
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-[#666]">
            {time.toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-500 font-mono">LIVE</span>
          </span>
        </div>
      </header>

      <div className="p-6 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "CALLS TODAY", value: callsToday.toString(), delta: "+12%" },
            { label: "SUCCESS RATE", value: "84%", delta: "+3.2%" },
            { label: "AVG DURATION", value: "4m 12s", delta: "-18s" },
            { label: "IN QUEUE", value: queue.filter((q) => q.status !== "Resolved").length.toString(), delta: "" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-[#2a2a2a] p-4"
            >
              <p className="text-[10px] text-[#666] font-mono uppercase tracking-widest">
                {stat.label}
              </p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-mono font-bold text-white">
                  {stat.value}
                </span>
                {stat.delta && (
                  <span className="text-[10px] font-mono text-green-500 mb-1">
                    {stat.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Call Log + Patient Queue */}
        <div className="grid grid-cols-5 gap-4">
          {/* Call Log - 60% */}
          <div className="col-span-3 border border-[#2a2a2a]">
            <div className="px-4 py-2 border-b border-[#2a2a2a] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
                Call Log
              </span>
              <span className="text-[10px] font-mono text-[#444]">
                {callLog.length} entries
              </span>
            </div>
            <div className="overflow-y-auto max-h-[320px]">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-[#666] uppercase border-b border-[#1a1a1a]">
                    <th className="text-left px-4 py-2">Patient</th>
                    <th className="text-left px-4 py-2">Task</th>
                    <th className="text-left px-4 py-2">Outcome</th>
                    <th className="text-left px-4 py-2">Duration</th>
                    <th className="text-left px-4 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {callLog.map((entry) => {
                    const oc = OUTCOME_COLORS[entry.outcome] || OUTCOME_COLORS.pending;
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-[#1a1a1a] hover:bg-[#111]"
                      >
                        <td className="px-4 py-2 text-xs font-mono text-white">
                          {entry.patient}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-[#999]">
                          {entry.task}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 ${oc.bg} ${oc.text} border ${oc.border}`}
                          >
                            {entry.outcome}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-[#666]">
                          {formatDuration(entry.duration)}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-[#444]">
                          {entry.time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Patient Queue - 40% */}
          <div className="col-span-2 border border-[#2a2a2a]">
            <div className="px-4 py-2 border-b border-[#2a2a2a]">
              <span className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
                Patient Queue
              </span>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {queue.map((p) => {
                const statusColor =
                  p.status === "Resolved"
                    ? "text-green-400 bg-green-900/40 border-green-700"
                    : p.status === "Calling" || p.status === "On hold"
                    ? "text-amber-400 bg-amber-900/40 border-amber-700"
                    : "text-blue-400 bg-blue-900/40 border-blue-700";
                return (
                  <div key={p.id} className="px-4 py-3 hover:bg-[#111]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-white">
                          {p.name}
                        </p>
                        <p className="text-[10px] font-mono text-[#666] mt-0.5">
                          {p.task}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 border ${statusColor}`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agent Performance + Recent Outcomes */}
        <div className="grid grid-cols-2 gap-4">
          {/* Agent Performance */}
          <div className="border border-[#2a2a2a]">
            <div className="px-4 py-2 border-b border-[#2a2a2a]">
              <span className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
                Agent Performance — This Week
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono text-[#666] mb-2">
                  CALLS BY DAY
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={MOCK_WEEKLY_CALLS}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }}
                      axisLine={{ stroke: "#2a2a2a" }}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#e5e5e5",
                      }}
                    />
                    <Bar dataKey="calls" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#666] mb-2">
                  TASK DISTRIBUTION
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={MOCK_TASK_TYPES}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={55}
                      innerRadius={30}
                      strokeWidth={0}
                    >
                      {MOCK_TASK_TYPES.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#e5e5e5",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {MOCK_TASK_TYPES.map((t) => (
                    <div key={t.name} className="flex items-center gap-1">
                      <span
                        className="w-2 h-2"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-[9px] font-mono text-[#666]">
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Outcomes */}
          <div className="border border-[#2a2a2a]">
            <div className="px-4 py-2 border-b border-[#2a2a2a]">
              <span className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
                Recent Outcomes
              </span>
            </div>
            <div className="divide-y divide-[#1a1a1a] overflow-y-auto max-h-[280px]">
              {MOCK_RECENT_OUTCOMES.map((o) => {
                const oc = OUTCOME_COLORS[o.outcome] || OUTCOME_COLORS.pending;
                return (
                  <div
                    key={o.id}
                    className="px-4 py-2.5 hover:bg-[#111] flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-[#666]">
                        {o.initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-white truncate">
                        {o.task}
                      </p>
                      <p className="text-[10px] font-mono text-[#444]">
                        Ref: {o.ref}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 border ${oc.bg} ${oc.text} ${oc.border}`}
                    >
                      {o.outcome}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
