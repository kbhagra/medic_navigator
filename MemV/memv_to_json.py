"""
memv_to_json.py
===============
Queries mem[v]ai for a patient's data and builds ONE structured JSON
ready for the reasoning model.

This is the READ side of the system.

Flow:
  Patient name/phone → query mem[v]ai → build JSON → reasoning model

JSON structure:
  {
    "patient_id":   "...",
    "created_at":   "...",
    "identity": {
      "name":     "...",
      "phone":    "...",
      "location": "..."
    },
    "health_info": {
      "primary_complaint": "...",
      "retrieved_memories": [ "...", "..." ]
    },
    "summary": null   ← reasoning model fills this in
  }

Usage:
  python memv_to_json.py --name "Jane Smith"
  python memv_to_json.py --name "Jane Smith" --output jane_smith.json
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
TOP_K      = 10  # pull enough memories to cover all fields


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def get_space_id(client):
    """Find the hospital intake space."""
    spaces = client.spaces.list()
    for space in spaces.spaces:
        if space.name == SPACE_NAME:
            return space.id
    raise ValueError(
        f"Space '{SPACE_NAME}' not found. Run memv_core.py first."
    )


def query_patient(client, space_id, name):
    """
    Pull all memories related to this patient from mem[v]ai.
    Returns a flat list of fact strings.
    """
    results = client.memories.search(
        space_ids=[space_id],
        query=name,
        max_results=TOP_K
    )
    return [memory.fact for memory in results.results]


def extract_field(facts, keywords):
    """
    Scan retrieved facts for a specific field by keyword match.
    Returns the first matching fact string, or None.
    """
    for fact in facts:
        if any(kw.lower() in fact.lower() for kw in keywords):
            return fact
    return None


def build_json(name, facts):
    """
    From the raw list of retrieved facts, assemble the
    structured patient JSON for the reasoning model.
    """

    # Pull identity fields from retrieved memories
    phone_fact    = extract_field(facts, ["phone", "number"])
    location_fact = extract_field(facts, ["located", "location"])
    issue_fact    = extract_field(facts, ["reporting", "called", "complaint",
                                          "pain", "issue", "injury"])

    # health_info contains everything health-related
    health_facts = [
        f for f in facts
        if any(kw in f.lower() for kw in [
            "reporting", "called", "pain", "issue", "injury",
            "complaint", "symptom", "health", "condition",
            "headache", "chest", "dizziness", "shortness",
            "difficulty", "fever", "nausea", "bleeding"
        ])
    ]

    # If no specific health facts found, include all retrieved facts
    # (memv.ai graph may surface them differently)
    if not health_facts:
        health_facts = facts

    payload = {
        "patient_id":  str(uuid.uuid4()),
        "created_at":  datetime.now(timezone.utc).isoformat(),
        "identity": {
            "name":     name,
            "phone":    phone_fact,
            "location": location_fact,
        },
        "health_info": {
            "primary_complaint":  issue_fact,
            "retrieved_memories": health_facts,
        },
        "summary": None   # reasoning model fills this in
    }

    return payload


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

DEMO_NAMES = ["Jane Smith", "Robert Chen", "Fatima Al-Hassan"]


def main():
    parser = argparse.ArgumentParser(
        description="Generate reasoning JSON from mem[v]ai patient data"
    )
    parser.add_argument("--name",     default=None,
                        help="Patient name to query (e.g. 'Jane Smith')")
    parser.add_argument("--output",   default="patient_payload.json",
                        help="Output JSON file (default: patient_payload.json)")
    parser.add_argument("--demo",     action="store_true",
                        help="Run all demo patients from memv_core.py")
    args = parser.parse_args()

    client = Memv(api_key=API_KEY)
    print("\n  Client ready.")

    space_id = get_space_id(client)
    print(f"  Space ID: {space_id}")

    if args.demo:
        print(f"\n  Demo mode — generating JSON for {len(DEMO_NAMES)} patients\n")

        for i, name in enumerate(DEMO_NAMES):
            print(f"  [{i+1}] Querying: {name}")
            facts   = query_patient(client, space_id, name)
            payload = build_json(name, facts)

            fname = f"patient_{i+1}_{name.replace(' ', '_').lower()}.json"
            with open(fname, "w") as f:
                json.dump(payload, f, indent=2)

            print(f"       Retrieved {len(facts)} memories")
            print(f"       Saved → {fname}\n")

        print("  All payloads generated.")

    else:
        # Single patient query
        name = args.name
        if not name:
            # Default to first demo patient if no name given
            name = DEMO_NAMES[0]
            print(f"\n  No --name provided, defaulting to: {name}")

        print(f"\n  Querying mem[v]ai for: {name}")
        facts   = query_patient(client, space_id, name)
        payload = build_json(name, facts)

        print(f"  Retrieved {len(facts)} memories")

        with open(args.output, "w") as f:
            json.dump(payload, f, indent=2)

        print(f"  Saved → {args.output}")
        print(f"\n{'─'*55}")
        print(json.dumps(payload, indent=2))
        print(f"{'─'*55}\n")


if __name__ == "__main__":
    main()