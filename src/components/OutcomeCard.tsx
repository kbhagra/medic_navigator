"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CallOutcome } from "@/types";

type Props = {
  outcome: CallOutcome;
  onNewTask: () => void;
};

const STATUS_CONFIG = {
  approved: { label: "Approved", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  denied: { label: "Denied", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  pending: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  escalated: { label: "Escalated", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  "follow-up": { label: "Follow-up needed", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
};

export default function OutcomeCard({ outcome, onNewTask }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);
  const config = STATUS_CONFIG[outcome.status] || STATUS_CONFIG.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="max-w-lg mx-auto"
    >
      <div className={`p-6 rounded-xl border-2 ${config.border} bg-white shadow-lg`}>
        <div className="text-center mb-4">
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${config.bg} ${config.text}`}
          >
            {config.label}
          </span>
        </div>

        {outcome.referenceNumber && (
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Reference Number
            </p>
            <p className="text-lg font-mono font-bold text-gray-900">
              {outcome.referenceNumber}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-700 text-center mb-4">
          {outcome.summary}
        </p>

        {outcome.nextAction && (
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Next Action
            </p>
            <p className="text-sm font-medium text-gray-900">
              {outcome.nextAction}
            </p>
            {outcome.nextActionDate && (
              <p className="text-xs text-gray-500 mt-1">
                {outcome.nextActionDate}
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium mb-3"
        >
          {showTranscript ? "Hide" : "View"} full transcript
        </button>

        {showTranscript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto mb-4"
          >
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
              {outcome.transcript}
            </pre>
          </motion.div>
        )}

        <button
          onClick={onNewTask}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Handle another task &rarr;
        </button>
      </div>
    </motion.div>
  );
}
