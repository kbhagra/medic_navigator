"use client";

import { motion } from "framer-motion";

const STEPS = ["Onboard", "Research", "Script", "Call", "Done"];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < current
                  ? "bg-green-500 text-white"
                  : i === current
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
              animate={i === current ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {i < current ? "\u2713" : i + 1}
            </motion.div>
            <span
              className={`text-[10px] mt-1 ${
                i <= current ? "text-gray-900 font-medium" : "text-gray-400"
              }`}
            >
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-10 h-0.5 mx-1 mb-4 ${
                i < current ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
