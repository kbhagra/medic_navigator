"""
memv_core.py
============
Reads patient call-in data from a JSON file and pushes it to mem[v]ai.
Also writes a local phone_index.json for exact phone → name lookup.

Usage:
  python memv_core.py                          # reads patients_input.json
  python memv_core.py --input my_patients.json
"""

import sys
import uuid
import json
import time
import argparse
from datetime import datetime, timezone

_argv = sys.argv[:]
sys.argv = [sys.argv[0]]
from memvai import Memv
sys.argv = _argv

API_KEY    = "memv_1e1398f523a2e4e4583829387bea87b545c6e0b90cc255ab"
SPACE_NAME = "hospital_patient_intake"
INDEX_FILE = "phone_index.json"


# ─────────────────────────────────────────────
# SPACE
# ─────────────────────────────────────────────

def get_or_create_space(client):
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
# PHONE INDEX — local exact lookup file
# ─────────────────────────────────────────────

def load_index():
    """Load existing phone → patient index or start fresh."""
    try:
        with open(INDEX_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_index(index):
    """Save phone → patient index to disk."""
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


# ─────────────────────────────────────────────
# PUSH
# ─────────────────────────────────────────────

def push_patient(client, space_id, patient, index, retries=3):
    """
    Push one patient's call-in data to mem[v]ai with retry on 500.
    """
    patient_id = str(uuid.uuid4())
    timestamp  = datetime.now(timezone.utc).isoformat()
    name       = patient["name"]
    phone      = patient["phone"]

    memories = [
        {"content": f"Patient name: {name}. Patient ID: {patient_id}."},
        {"content": f"{name} phone number is {phone}."},
        {"content": f"{name} is located in {patient['location']}."},
        {"content": f"{name} called on {timestamp} reporting: {patient['health_issue']}."},
    ]

    for attempt in range(1, retries + 1):
        try:
            client.memories.add(space_id=space_id, memories=memories)
            break
        except Exception as e:
            if attempt < retries:
                wait = attempt * 3
                print(f"    Attempt {attempt} failed, retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"    ERROR: Failed after {retries} attempts — {e}")
                return None

    # Register in local index
    index[phone] = {
        "name":       name,
        "patient_id": patient_id,
        "location":   patient["location"],
        "pushed_at":  timestamp
    }

    print(f"  Pushed: {name} | phone: {phone}")
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

    print(f"\n{'='*55}")
    print("  memv_core.py — Patient Call-In Push")
    print(f"{'='*55}")

    # Read input JSON
    print(f"\n  Reading: {args.input}")
    try:
        with open(args.input, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"\n  ERROR: File not found — {args.input}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"\n  ERROR: Invalid JSON — {e}")
        sys.exit(1)

    patients = data.get("patients", [])
    if not patients:
        print("\n  ERROR: No patients found in JSON.")
        sys.exit(1)

    print(f"  Found {len(patients)} patient(s) to push.\n")

    # Connect
    client   = Memv(api_key=API_KEY)
    space_id = get_or_create_space(client)

    # Load existing index and push
    index = load_index()
    print()
    skipped = 0
    for i, patient in enumerate(patients):
        phone = patient["phone"]
        if phone in index:
            print(f"  [{i+1}/{len(patients)}] Skipping {patient['name']} — already in index")
            skipped += 1
            continue
        print(f"  [{i+1}/{len(patients)}]", end=" ")
        push_patient(client, space_id, patient, index)
        save_index(index)  # save after each push so crashes don't lose progress
        time.sleep(1)      # avoid rate limiting

    print(f"\n{'='*55}")
    print(f"  Done. {len(patients) - skipped} new patient(s) pushed, {skipped} skipped.")
    print(f"  Phone index saved → {INDEX_FILE}")
    print(f"  Space ID: {space_id}")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()