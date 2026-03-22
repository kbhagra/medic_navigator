"""
memv_to_json.py
===============
Looks up patient by phone number using local index,
then queries mem[v]ai by name for all semantic memories,
and builds ONE clean JSON for the reasoning model.

Flow:
  phone → phone_index.json (exact lookup) → name
        → mem[v]ai search by name (semantic) → facts
        → build JSON → reasoning model

Usage:
  python memv_to_json.py --phone "555-0101"
  python memv_to_json.py --phone "555-0101" --output jane.json
  python memv_to_json.py --demo
"""

import sys
import json
import uuid
import argparse
from datetime import datetime, timezone

_argv = sys.argv[:]
sys.argv = [sys.argv[0]]
from memvai import Memv
sys.argv = _argv

API_KEY    = "memv_1e1398f523a2e4e4583829387bea87b545c6e0b90cc255ab"
SPACE_NAME = "hospital_patient_intake"
INDEX_FILE = "phone_index.json"
TOP_K      = 15


# ─────────────────────────────────────────────
# SPACE
# ─────────────────────────────────────────────

def get_space_id(client):
    spaces = client.spaces.list()
    for space in spaces.spaces:
        if space.name == SPACE_NAME:
            return space.id
    raise ValueError(f"Space '{SPACE_NAME}' not found. Run memv_core.py first.")


# ─────────────────────────────────────────────
# PHONE INDEX — exact lookup
# ─────────────────────────────────────────────

def load_index():
    try:
        with open(INDEX_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"'{INDEX_FILE}' not found. Run memv_core.py first to push patients."
        )


def lookup_by_phone(phone, index):
    """Exact phone → patient record from local index."""
    entry = index.get(phone)
    if not entry:
        raise ValueError(
            f"Phone {phone} not found in index. "
            f"Make sure this patient was pushed via memv_core.py."
        )
    return entry


# ─────────────────────────────────────────────
# MEMV QUERY
# ─────────────────────────────────────────────

def query_by_name(client, space_id, name):
    """Pull all memories for this patient from mem[v]ai by name."""
    results = client.memories.search(
        space_ids=[space_id],
        query=name,
        max_results=TOP_K
    )
    return [memory.fact for memory in results.results]


# ─────────────────────────────────────────────
# BUILD JSON
# ─────────────────────────────────────────────

def extract_field(facts, keywords):
    for fact in facts:
        if any(kw.lower() in fact.lower() for kw in keywords):
            return fact
    return None


def build_json(phone, index_entry, facts):
    """
    Assemble the final patient JSON for the reasoning model.
    Identity comes from the local index (exact).
    Health info comes from mem[v]ai semantic retrieval.
    """
    name     = index_entry["name"]
    location = index_entry["location"]

    # Primary complaint from memv.ai facts
    issue_fact = extract_field(facts, [
        "reporting", "called", "complaint", "pain", "issue",
        "injury", "symptoms", "headache", "chest", "dizziness",
        "difficulty", "fever", "nausea", "bleeding",
        "shortness", "weakness", "swelling", "rash",
        "attack", "reaction", "tightness", "bruising",
        "locking", "laceration", "sprain", "abscess"
    ])

    # All health-related facts
    health_facts = [
        f for f in facts
        if any(kw in f.lower() for kw in [
            "reporting", "called", "pain", "issue", "injury",
            "complaint", "symptom", "health", "condition",
            "headache", "chest", "dizziness", "shortness",
            "difficulty", "fever", "nausea", "bleeding",
            "weakness", "swelling", "rash", "attack",
            "reaction", "tightness", "bruising", "locking",
            "laceration", "sprain", "abscess", "vision",
            "hearing", "fatigue", "weight", "urination",
            "heartbeat", "palpitation", "anxiety", "migraine"
        ])
    ]

    # Fallback: include all facts if no health keywords matched
    if not health_facts:
        health_facts = facts

    return {
        "patient_id": index_entry["patient_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "identity": {
            "name":     name,
            "phone":    phone,
            "location": location,
        },
        "health_info": {
            "primary_complaint":  issue_fact,
            "retrieved_memories": health_facts,
        },
        "summary": None   # reasoning model fills this in
    }


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate reasoning JSON from mem[v]ai patient data"
    )
    parser.add_argument("--phone",  default=None,
                        help="Patient phone number (e.g. '555-0101')")
    parser.add_argument("--output", default="patient_payload.json",
                        help="Output JSON file (default: patient_payload.json)")
    parser.add_argument("--demo",   action="store_true",
                        help="Run first 3 patients from the index")
    args = parser.parse_args()

    client = Memv(api_key=API_KEY)
    print("\n  Client ready.")

    space_id = get_space_id(client)
    print(f"  Space ID: {space_id}")

    index = load_index()
    print(f"  Phone index loaded — {len(index)} patient(s) registered.")

    if args.demo:
        demo_phones = list(index.keys())[:3]
        print(f"\n  Demo mode — generating JSON for {len(demo_phones)} patients\n")

        for i, phone in enumerate(demo_phones):
            entry   = lookup_by_phone(phone, index)
            name    = entry["name"]
            print(f"  [{i+1}] {name} ({phone})")

            facts   = query_by_name(client, space_id, name)
            payload = build_json(phone, entry, facts)

            fname = f"patient_{phone.replace('-', '_')}.json"
            with open(fname, "w") as f:
                json.dump(payload, f, indent=2)

            print(f"       {len(facts)} memories retrieved → {fname}\n")

        print("  All payloads generated.")

    else:
        phone = args.phone
        if not phone:
            # Default to first patient in index
            phone = list(index.keys())[0]
            print(f"\n  No --phone provided, defaulting to: {phone}")

        entry = lookup_by_phone(phone, index)
        name  = entry["name"]

        print(f"\n  Patient: {name} ({phone})")
        print(f"  Querying mem[v]ai...")

        facts   = query_by_name(client, space_id, name)
        payload = build_json(phone, entry, facts)

        print(f"  {len(facts)} memories retrieved.")

        with open(args.output, "w") as f:
            json.dump(payload, f, indent=2)

        print(f"  Saved → {args.output}")
        print(f"\n{'─'*55}")
        print(json.dumps(payload, indent=2))
        print(f"{'─'*55}\n")


if __name__ == "__main__":
    main()