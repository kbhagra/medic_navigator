"""
memv_core.py
============
Reads patient call-in data from a JSON file and pushes it to mem[v]ai.

Expected JSON format (patients_input.json):
  {
    "patients": [
      {
        "name":         "Jane Smith",
        "phone":        "555-0101",
        "location":     "Hayward, CA",
        "health_issue": "severe headache and dizziness since yesterday"
      },
      ...
    ]
  }

Usage:
  python memv_core.py                              # reads patients_input.json
  python memv_core.py --input my_patients.json     # reads custom file
"""

import sys
import uuid
import json
import argparse
from datetime import datetime, timezone

_argv = sys.argv[:]
sys.argv = [sys.argv[0]]
from memvai import Memv
sys.argv = _argv

API_KEY    = "memv_1e1398f523a2e4e4583829387bea87b545c6e0b90cc255ab"
SPACE_NAME = "hospital_patient_intake"


# ─────────────────────────────────────────────
# SPACE
# ─────────────────────────────────────────────

def get_or_create_space(client):
    """Get existing space or create it if it doesn't exist."""
    spaces = client.spaces.list()
    for space in spaces.spaces:
        if space.name == SPACE_NAME:
            print(f"  Using existing space: {space.id}")
            return space.id

    result = client.spaces.create(
        name=SPACE_NAME,
        description="Patient call-in records for hospital scheduling system."
    )
    space_id = result.space.id
    print(f"  Created new space: {space_id}")
    return space_id


# ─────────────────────────────────────────────
# PUSH
# ─────────────────────────────────────────────

def push_patient(client, space_id, patient):
    """
    Push one patient's call-in data to mem[v]ai.
    Each field is a discrete memory for the knowledge graph.
    """
    patient_id = str(uuid.uuid4())
    timestamp  = datetime.now(timezone.utc).isoformat()
    name       = patient["name"]

    memories = [
        {"content": f"Patient name: {name}. Patient ID: {patient_id}."},
        {"content": f"{name} phone number is {patient['phone']}."},
        {"content": f"{name} is located in {patient['location']}."},
        {"content": f"{name} called on {timestamp} reporting: {patient['health_issue']}."},
    ]

    client.memories.add(space_id=space_id, memories=memories)

    print(f"  Pushed: {name} ({len(memories)} memories) — ID: {patient_id}")
    return patient_id


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Push patient call-in data from JSON to mem[v]ai"
    )
    parser.add_argument(
        "--input", default="patients_input.json",
        help="Path to input JSON file (default: patients_input.json)"
    )
    args = parser.parse_args()

    # ── Read input JSON ───────────────────────
    print(f"\n{'='*55}")
    print("  memv_core.py — Patient Call-In Push")
    print(f"{'='*55}")

    print(f"\n  Reading: {args.input}")
    try:
        with open(args.input, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"\n  ERROR: File not found — {args.input}")
        print("  Create a patients_input.json file with the required format.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"\n  ERROR: Invalid JSON — {e}")
        sys.exit(1)

    patients = data.get("patients", [])
    if not patients:
        print("\n  ERROR: No patients found in JSON. "
              "Check that your file has a 'patients' array.")
        sys.exit(1)

    print(f"  Found {len(patients)} patient(s) to push.\n")

    # ── Connect and push ──────────────────────
    client   = Memv(api_key=API_KEY)
    space_id = get_or_create_space(client)

    print()
    for i, patient in enumerate(patients):
        print(f"  [{i+1}/{len(patients)}]", end=" ")
        push_patient(client, space_id, patient)

    print(f"\n{'='*55}")
    print(f"  Done. {len(patients)} patient(s) pushed to mem[v]ai.")
    print(f"  Space ID: {space_id}")
    print(f"  Run memv_to_json.py --name '<name>' to generate the reasoning payload.")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()