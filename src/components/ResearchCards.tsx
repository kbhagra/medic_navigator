"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResearchResult } from "@/types";

type Props = {
  research: ResearchResult | null;
  loading: boolean;
};

export default function ResearchCards({ research, loading }: Props) {
  const [visibleCards, setVisibleCards] = useState(0);

  useEffect(() => {
    if (research) {
      const t1 = setTimeout(() => setVisibleCards(1), 400);
      const t2 = setTimeout(() => setVisibleCards(2), 1000);
      const t3 = setTimeout(() => setVisibleCards(3), 1600);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [research]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-lg mx-auto text-center py-12"
      >
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 font-medium">Researching your case...</p>
        <p className="text-sm text-gray-400 mt-1">
          Checking insurance rules, finding contact info, building your case
        </p>
      </motion.div>
    );
  }

  if (!research) return null;

  const cards = [
    {
      title: "Insurance Rules",
      icon: "\ud83d\udccb",
      content: research.insuranceRules,
      color: "blue",
    },
    {
      title: "Contact Info",
      icon: "\ud83d\udcde",
      content: `${research.contactInfo.department}\n${research.contactInfo.phone}\n${research.contactInfo.hours}`,
      color: "green",
    },
    {
      title: "Best Arguments",
      icon: "\ud83c\udfaf",
      content: research.bestArguments.join("\n\n"),
      color: "purple",
    },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Research Results
      </h2>
      <AnimatePresence>
        {cards.map(
          (card, i) =>
            i < visibleCards && (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`p-4 rounded-lg border ${
                  card.color === "blue"
                    ? "border-blue-200 bg-blue-50"
                    : card.color === "green"
                    ? "border-green-200 bg-green-50"
                    : "border-purple-200 bg-purple-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{card.icon}</span>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {card.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {card.content}
                </p>
              </motion.div>
            )
        )}
      </AnimatePresence>
      {visibleCards >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center pt-2"
        >
          <div className="inline-flex items-center gap-2 text-sm text-green-600 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Success probability: {Math.round(research.estimatedSuccessRate * 100)}%
          </div>
        </motion.div>
      )}
    </div>
  );
}
