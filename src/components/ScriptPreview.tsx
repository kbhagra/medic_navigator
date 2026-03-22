"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CallScript } from "@/types";

type Props = {
  script: CallScript;
  onPlaceCall: () => void;
  loading: boolean;
};

export default function ScriptPreview({ script, onPlaceCall, loading }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [editedScript, setEditedScript] = useState(script.fullScript);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Script</h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Target</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">
            {script.targetPhone}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Est. Duration</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">
            {script.estimatedDuration}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Key Info</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">
            {script.keyInfo.length} items ready
          </p>
        </div>
      </div>

      {editMode ? (
        <textarea
          value={editedScript}
          onChange={(e) => setEditedScript(e.target.value)}
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
          <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
            {script.fullScript}
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {editMode ? "Done editing" : "Edit script"}
        </button>
        <button
          onClick={onPlaceCall}
          disabled={loading}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Initiating..." : "Place call now \u2192"}
        </button>
      </div>
    </motion.div>
  );
}
