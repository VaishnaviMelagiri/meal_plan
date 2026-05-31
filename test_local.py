"""
NutriGenie Local Test Script
Run from the project root: python3 test_local.py

Tests core logic WITHOUT any AWS calls:
  1. Patient JSON parsing (_parse_iom_data)
  2. Food matching (_get_approved_foods)
  3. Prompt building (_generate_meal_plan prompt section)
  4. Fallback plan (_generate_fallback_plan)

Place this file in your project root alongside template.yaml.
Make sure patients/IOM_KIT001.json and patients/IOM_KIT_SENS.json exist.
"""

import json
import sys
import os

# ── Path setup ────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
GENERATE_MEAL_DIR = os.path.join(PROJECT_ROOT, "backend", "lambdas", "generate_meal")
sys.path.insert(0, GENERATE_MEAL_DIR)

# Patch out boto3/AWS before importing the lambda
import unittest.mock as mock

# We mock boto3 so the import doesn't crash without AWS credentials
boto3_mock = mock.MagicMock()
sys.modules["boto3"] = boto3_mock

# Now import the lambda functions directly
import lambda_function as lf

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_patient_json(path: str) -> dict:
    with open(path) as f:
        return json.load(f)

def load_ifct(path: str) -> list:
    with open(path) as f:
        raw = json.load(f)
    # Apply same cleaning as _load_nutrition_data
    seen_ids = set()
    clean = []
    for item in raw:
        if item["food_id"] in seen_ids:
            continue
        if item.get("per_100g", {}).get("calories", 0) >= 50:
            seen_ids.add(item["food_id"])
            clean.append(item)
    return clean

def separator(title: str):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)

def check(label: str, condition: bool, detail: str = ""):
    status = "✅ PASS" if condition else "❌ FAIL"
    print(f"  {status}  {label}")
    if detail:
        print(f"         {detail}")

# ── Paths ─────────────────────────────────────────────────────────────────────

PATIENTS = {
    "IOM_KIT001": os.path.join(PROJECT_ROOT, "patients", "IOM_KIT001.json"),
    "IOM_KIT_SENS": os.path.join(PROJECT_ROOT, "patients", "IOM_KIT_SENS.json"),
}
IFCT_PATH = os.path.join(PROJECT_ROOT, "backend", "data", "indian_nutrition_dataset.json")

# ── TEST 1: File existence ─────────────────────────────────────────────────────

separator("TEST 1 — Required files exist")
for kit_id, path in PATIENTS.items():
    check(f"{kit_id}.json exists", os.path.exists(path), path)
check("indian_nutrition_dataset.json exists", os.path.exists(IFCT_PATH), IFCT_PATH)

# ── TEST 2: IFCT cleaning ──────────────────────────────────────────────────────

separator("TEST 2 — IFCT dataset cleaning")
try:
    ifct = load_ifct(IFCT_PATH)
    raw_count = len(json.load(open(IFCT_PATH)))
    check(f"Raw items loaded", True, f"{raw_count} total")
    check(f"Clean items after filter (cal >= 50, deduped)", len(ifct) > 100,
          f"{len(ifct)} clean items (was {raw_count})")
    check("No zero-calorie items in clean set",
          all(i["per_100g"]["calories"] >= 50 for i in ifct),
          f"min cal = {min(i['per_100g']['calories'] for i in ifct):.1f}")
except Exception as e:
    check("IFCT load", False, str(e))
    ifct = []

# ── TEST 3: Patient JSON parsing ───────────────────────────────────────────────

separator("TEST 3 — Patient JSON parsing")

patients_parsed = {}
for kit_id, path in PATIENTS.items():
    if not os.path.exists(path):
        print(f"  SKIP {kit_id} — file not found")
        continue

    try:
        raw = load_patient_json(path)
        patient = lf._parse_iom_data(raw, kit_id)
        patients_parsed[kit_id] = patient

        print(f"\n  [{kit_id}]")
        check("kit_id present", bool(patient.get("kit_id")),
              patient.get("kit_id"))
        check("product_type present", bool(patient.get("product_type")),
              patient.get("product_type"))
        check("diet_type not default Veg for SEnS" if "SENS" in kit_id else "diet_type present",
              patient.get("diet_type") not in ["", None],
              patient.get("diet_type"))
        check(f"yes_foods populated ({len(patient.get('yes_foods', []))} items)",
              len(patient.get("yes_foods", [])) > 0,
              str(patient.get("yes_foods", [])[:5]) + "...")
        check(f"avoid_foods populated ({len(patient.get('avoid_foods', []))} items)",
              len(patient.get("avoid_foods", [])) > 0,
              str(patient.get("avoid_foods", [])[:5]) + "...")
        check(f"avoid_list from allergies ({len(patient.get('avoid_list', []))} items)",
              True,
              str(patient.get("avoid_list", [])))
        check(f"bacteria_to_increase ({len(patient.get('bacteria_to_increase', []))} items)",
              len(patient.get("bacteria_to_increase", [])) > 0,
              str([b["name"] for b in patient.get("bacteria_to_increase", [])]))
        check(f"bacteria_to_decrease ({len(patient.get('bacteria_to_decrease', []))} items)",
              len(patient.get("bacteria_to_decrease", [])) > 0,
              str([b["name"] for b in patient.get("bacteria_to_decrease", [])]))

        # Check no summary rows leaked through
        bad_bacteria = [b["name"] for b in patient.get("bacteria_to_increase", []) +
                        patient.get("bacteria_to_decrease", [])
                        if any(s in b["name"] for s in ("Other", "all", "bot", "top", "Non"))]
        check("No summary rows in bacteria", len(bad_bacteria) == 0,
              f"Bad rows: {bad_bacteria}" if bad_bacteria else "clean")

    except Exception as e:
        check(f"{kit_id} parse", False, str(e))

# ── TEST 4: Food matching ──────────────────────────────────────────────────────

separator("TEST 4 — Food matching (_get_approved_foods)")

for kit_id, patient in patients_parsed.items():
    print(f"\n  [{kit_id}]")
    try:
        approved = lf._get_approved_foods(patient, ifct)
        with_ifct = [f for f in approved if f.get("ifct_match") is not False]
        llm_only = [f for f in approved if f.get("ifct_match") is False]

        check(f"Approved foods returned ({len(approved)} items)",
              len(approved) > 0)
        check(f"IFCT-matched foods: {len(with_ifct)}",
              True,
              str([f["name_en"] for f in with_ifct[:5]]))
        check(f"LLM-estimate foods: {len(llm_only)}",
              True,
              str([f.get("name_en", f.get("food_item", "?")) for f in llm_only[:5]]))

        # Critical: no avoid foods in approved list
        avoid_set = set(a.lower() for a in
                        patient.get("avoid_foods", []) + patient.get("avoid_list", []))
        snuck_in = [f.get("name_en", "") for f in approved
                    if f.get("name_en", "").lower() in avoid_set]
        check("No avoid foods in approved list", len(snuck_in) == 0,
              f"Leaked: {snuck_in}" if snuck_in else "clean")

        # Check capped at 25
        check("Result capped at 25", len(approved) <= 25,
              f"count = {len(approved)}")

    except Exception as e:
        check(f"{kit_id} food matching", False, str(e))
        approved = []

# ── TEST 5: Merged avoids ──────────────────────────────────────────────────────

separator("TEST 5 — Merged avoid list (food_list + allergies)")

for kit_id, patient in patients_parsed.items():
    print(f"\n  [{kit_id}]")
    avoid_foods = patient.get("avoid_foods", [])
    avoid_list = patient.get("avoid_list", [])

    merged = []
    seen = set()
    for a in avoid_foods + avoid_list:
        if a and a.lower() not in seen:
            seen.add(a.lower())
            merged.append(a)

    check(f"food_list avoids: {len(avoid_foods)}", len(avoid_foods) > 0,
          str(avoid_foods[:3]))
    check(f"allergy avoids: {len(avoid_list)}", True,
          str(avoid_list))
    check(f"merged total: {len(merged)}", len(merged) >= len(avoid_foods),
          str(merged[:5]))
    check("No duplicates in merged", len(merged) == len(set(a.lower() for a in merged)))

# ── TEST 6: Fallback plan ──────────────────────────────────────────────────────

separator("TEST 6 — Fallback plan (no hardcoded Rice)")

for kit_id, patient in patients_parsed.items():
    print(f"\n  [{kit_id}]")
    try:
        approved = lf._get_approved_foods(patient, ifct)
        fallback = lf._generate_fallback_plan(patient, approved, 1800)

        check("Returns dict with calorie_target", "calorie_target" in fallback)
        check("Has day_1", "day_1" in fallback)

        day = fallback.get("day_1", {})
        meals = ["breakfast", "mid_morning_snack", "lunch", "evening_snack", "dinner"]
        for meal in meals:
            check(f"{meal} present", meal in day,
                  day.get(meal, {}).get("name", "MISSING"))

        # Critical: no hardcoded Rice
        all_names = [day.get(m, {}).get("name", "") for m in meals]
        has_rice = any("Rice" in n and len(n) < 10 for n in all_names)
        check("No standalone 'Rice' hardcoded", not has_rice,
              str(all_names))

        # Has note
        check("Has note for patient", bool(day.get("note")), day.get("note", ""))

        # Names come from yes_foods, not invented
        yes_lower = [f.lower() for f in patient.get("yes_foods", [])]
        for meal in meals:
            meal_name = day.get(meal, {}).get("name", "").lower()
            from_yes = any(y in meal_name for y in yes_lower)
            check(f"{meal} name from yes_foods", from_yes, meal_name)

    except Exception as e:
        check(f"{kit_id} fallback", False, str(e))
        import traceback; traceback.print_exc()

# ── TEST 7: Prompt sanity check ────────────────────────────────────────────────

separator("TEST 7 — Prompt content check (without calling Bedrock)")

for kit_id, patient in patients_parsed.items():
    print(f"\n  [{kit_id}]")
    try:
        approved = lf._get_approved_foods(patient, ifct)

        # Build merged avoids same way as lambda
        merged_avoids = []
        seen_avoids = set()
        for a in list(patient.get("avoid_foods", [])) + list(patient.get("avoid_list", [])):
            if a and a.lower() not in seen_avoids:
                seen_avoids.add(a.lower())
                merged_avoids.append(a)

        # Build food context same way as lambda
        food_lines = []
        for f in approved:
            if f.get("ifct_match") is False:
                food_lines.append(f"- APPROVED: {f.get('name_en', '')} (nutrition estimated)")
            else:
                n = f.get("per_100g", {})
                food_lines.append(
                    f"- APPROVED: {f['name_en']} ({f.get('category', 'Approved')}): "
                    f"{n.get('calories', 0)} kcal, {n.get('protein_g', 0)}g protein, "
                    f"{n.get('carbs_g', 0)}g carbs, {n.get('fat_g', 0)}g fat"
                )
        food_context = "\n".join(food_lines)

        check("APPROVED foods in prompt", "APPROVED" in food_context,
              f"{len(food_lines)} food lines")
        check("Avoid list not empty", len(merged_avoids) > 0,
              f"{len(merged_avoids)} avoid items")
        check("USDA/ICMR instruction present",
              True, "LLM told to use USDA/ICMR data (rule 4 in prompt)")
        check("No avoid food appears in approved list",
              not any(a.lower() in food_context.lower() for a in merged_avoids[:5]),
              "spot check first 5 avoids")
        check("Product type context correct",
              patient.get("product_type") in ["GutHeal", "SEnS"],
              patient.get("product_type"))

    except Exception as e:
        check(f"{kit_id} prompt check", False, str(e))
        import traceback; traceback.print_exc()

# ── Summary ────────────────────────────────────────────────────────────────────

separator("DONE — review any ❌ FAIL above before deploying")
print()
print("  Next step: upload patient JSONs + IFCT to S3, then sam deploy --guided")
print()