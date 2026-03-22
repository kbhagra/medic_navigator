import { readFileSync } from "fs";
import { join } from "path";

type PhoneIndexEntry = {
  name: string;
  patient_id: string;
  location: string;
  pushed_at: string;
};

type PatientInput = {
  name: string;
  phone: string;
  location: string;
  health_issue: string;
};

let phoneIndex: Record<string, PhoneIndexEntry> | null = null;
let patientsData: { patients: PatientInput[] } | null = null;

function loadPhoneIndex(): Record<string, PhoneIndexEntry> {
  if (phoneIndex) return phoneIndex;
  try {
    const raw = readFileSync(
      join(process.cwd(), "MemV", "phone_index.json"),
      "utf-8"
    );
    phoneIndex = JSON.parse(raw);
    return phoneIndex!;
  } catch {
    return {};
  }
}

function loadPatients(): PatientInput[] {
  if (patientsData) return patientsData.patients;
  try {
    const raw = readFileSync(
      join(process.cwd(), "MemV", "patients_input.json"),
      "utf-8"
    );
    patientsData = JSON.parse(raw);
    return patientsData!.patients;
  } catch {
    return [];
  }
}

// Normalize phone: strip everything except digits, take last 7
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Try last 7 digits (local format like 555-0101)
  return digits.slice(-7);
}

export function lookupByPhone(phone: string): {
  indexEntry: PhoneIndexEntry | null;
  patientData: PatientInput | null;
} {
  const index = loadPhoneIndex();
  const patients = loadPatients();

  const normalized = normalizePhone(phone);

  // Try exact match first
  if (index[phone]) {
    const patient = patients.find((p) => p.phone === phone);
    return { indexEntry: index[phone], patientData: patient || null };
  }

  // Try normalized match against index keys
  for (const [key, entry] of Object.entries(index)) {
    if (normalizePhone(key) === normalized) {
      const patient = patients.find((p) => p.phone === key);
      return { indexEntry: entry, patientData: patient || null };
    }
  }

  // Try matching by name if we have an extracted name
  return { indexEntry: null, patientData: null };
}

export function lookupByName(name: string): {
  indexEntry: PhoneIndexEntry | null;
  patientData: PatientInput | null;
  phone: string | null;
} {
  const index = loadPhoneIndex();
  const patients = loadPatients();
  const nameLower = name.toLowerCase();

  for (const [phone, entry] of Object.entries(index)) {
    if (entry.name.toLowerCase().includes(nameLower) || nameLower.includes(entry.name.toLowerCase())) {
      const patient = patients.find((p) => p.phone === phone);
      return { indexEntry: entry, patientData: patient || null, phone };
    }
  }

  // Try patients list directly
  const patient = patients.find(
    (p) =>
      p.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(p.name.toLowerCase())
  );
  if (patient) {
    const entry = index[patient.phone] || null;
    return { indexEntry: entry, patientData: patient, phone: patient.phone };
  }

  return { indexEntry: null, patientData: null, phone: null };
}

export async function queryMemvAI(name: string): Promise<string[]> {
  const apiKey = process.env.MEMV_API_KEY;
  if (!apiKey) return [];

  try {
    // Use the memv API to search for patient memories
    const response = await fetch("https://api.memv.ai/v1/memories/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: name,
        max_results: 15,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    // Extract facts from results
    if (Array.isArray(data.results)) {
      return data.results.map((r: { fact?: string; content?: string }) => r.fact || r.content || "").filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}
