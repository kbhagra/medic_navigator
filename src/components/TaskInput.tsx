"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const EXAMPLE_TASKS = [
  "Get my Ozempic prior auth approved",
  "Fight my denied MRI claim",
  "Schedule a specialist referral",
  "Find an in-network cardiologist",
];

type Props = {
  onSubmit: (task: string) => void;
};

export default function TaskInput({ onSubmit }: Props) {
  const [task, setTask] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          What do you need done?
        </h2>
        <p className="text-gray-500 mt-2">
          Describe your task and Navigator will handle the call.
        </p>
      </div>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        placeholder="Describe what you need help with..."
      />

      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLE_TASKS.map((example) => (
          <button
            key={example}
            onClick={() => setTask(example)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors"
          >
            {example}
          </button>
        ))}
      </div>

      <button
        onClick={() => task.trim() && onSubmit(task.trim())}
        disabled={!task.trim()}
        className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        Research &amp; Call
      </button>
    </motion.div>
  );
}
