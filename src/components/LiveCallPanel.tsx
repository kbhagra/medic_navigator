"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

type Props = {
  callId: string;
  onCallComplete: () => void;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  connecting: { label: "Connecting", color: "bg-yellow-500" },
  ringing: { label: "Ringing", color: "bg-yellow-500" },
  connected: { label: "Connected", color: "bg-green-500" },
  speaking: { label: "Speaking with agent", color: "bg-green-500" },
  "on-hold": { label: "On hold", color: "bg-amber-500" },
  ended: { label: "Call ended", color: "bg-gray-500" },
};

export default function LiveCallPanel({ callId, onCallComplete }: Props) {
  const [status, setStatus] = useState("connecting");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // SSE stream
  useEffect(() => {
    const eventSource = new EventSource(`/api/vapi/stream?callId=${callId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "status") {
        setStatus(data.status);
      }

      if (data.type === "transcript") {
        setTranscript((prev) => {
          if (prev.includes(data.line)) return prev;
          return [...prev, data.line];
        });
      }

      if (data.type === "complete") {
        eventSource.close();
        onCallComplete();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [callId, onCallComplete]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.connecting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-3 h-3 rounded-full ${statusInfo.color}`}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="text-sm font-semibold text-gray-900">
            {statusInfo.label}
          </span>
        </div>
        <span className="text-sm font-mono text-gray-500">
          {formatTime(elapsed)}
        </span>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg mb-4 flex items-center gap-3">
        <motion.div
          className="w-2 h-2 bg-blue-500 rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <p className="text-sm text-blue-700">
          Call is being handled by Navigator AI
        </p>
      </div>

      <div
        ref={transcriptRef}
        className="h-72 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
      >
        {transcript.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Waiting for connection...
          </p>
        ) : (
          transcript.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-sm ${
                line.includes("Navigator AI")
                  ? "text-blue-700"
                  : line.includes("Agent")
                  ? "text-gray-700"
                  : "text-gray-500"
              }`}
            >
              {line}
            </motion.p>
          ))
        )}
      </div>
    </motion.div>
  );
}
