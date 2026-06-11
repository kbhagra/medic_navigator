"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PatientProfile } from "@/types";

type Props = {
  onComplete: (profile: PatientProfile) => void;
};

export default function PatientOnboarding({ onComplete }: Props) {
  const [form, setForm] = useState({
    name: "",
    dob: "",
    insuranceProvider: "",
    planName: "",
    memberId: "",
    doctorName: "",
    doctorPhone: "",
    conditions: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const profile: PatientProfile = {
      id: `PAT-${Date.now()}`,
      name: form.name,
      dob: form.dob,
      insurance: {
        provider: form.insuranceProvider,
        planName: form.planName,
        memberId: form.memberId,
      },
      primaryDoctor: {
        name: form.doctorName,
        phone: form.doctorPhone,
      },
      conditions: form.conditions.split(",").map((c) => c.trim()).filter(Boolean),
      medications: [],
      email: form.email,
      callHistory: [],
    };

    try {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", patientProfile: profile }),
      });

      localStorage.setItem("patientProfile", JSON.stringify(profile));
      localStorage.setItem("patientId", profile.id);
      onComplete(profile);
    } catch {
      // Still proceed even if API fails
      localStorage.setItem("patientProfile", JSON.stringify(profile));
      localStorage.setItem("patientId", profile.id);
      onComplete(profile);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Navigator</h1>
        <p className="text-gray-500 mt-2">
          Tell us about yourself so we can fight for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Full name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Maria Santos"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Date of birth</label>
          <input
            type="date"
            className={inputClass}
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Insurance provider</label>
            <input
              className={inputClass}
              value={form.insuranceProvider}
              onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
              placeholder="Blue Cross"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Plan name</label>
            <input
              className={inputClass}
              value={form.planName}
              onChange={(e) => setForm({ ...form, planName: e.target.value })}
              placeholder="PPO Gold"
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Member ID</label>
          <input
            className={inputClass}
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            placeholder="BCX-449281"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Primary doctor</label>
            <input
              className={inputClass}
              value={form.doctorName}
              onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
              placeholder="Dr. James Chen"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Doctor&apos;s phone</label>
            <input
              className={inputClass}
              value={form.doctorPhone}
              onChange={(e) => setForm({ ...form, doctorPhone: e.target.value })}
              placeholder="(415) 555-0142"
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Conditions (comma-separated)</label>
          <input
            className={inputClass}
            value={form.conditions}
            onChange={(e) => setForm({ ...form, conditions: e.target.value })}
            placeholder="Type 2 Diabetes, Hypertension"
          />
        </div>

        <div>
          <label className={labelClass}>Email address</label>
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="maria@email.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Get started"}
        </button>
      </form>
    </motion.div>
  );
}
