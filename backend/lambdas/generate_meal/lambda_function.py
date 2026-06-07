"""
Lambda: generate_meal
RAG-based meal plan generation using Amazon Titan Text Express.
Reads patient data from S3, uses Indian nutrition dataset for RAG context,
generates a personalized 7-day meal plan with full nutrition breakdown.

API: POST /meal
Body: {"kit_id": "IOM_KIT001"}
"""

import json
import os
import logging
from datetime import datetime

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime")

DATA_BUCKET = os.environ.get("DATA_BUCKET", "nutrigenie-data")
LLM_MODEL_ID = os.environ.get("LLM_MODEL_ID", "amazon.nova-micro-v1:0")
MEAL_PLANS_TABLE = os.environ.get("MEAL_PLANS_TABLE", "NutriGenieMealPlans")
RECIPES_TABLE = os.environ.get("RECIPES_TABLE", "NutriGenieCustomRecipes")

# Cache for nutrition data (persists across warm Lambda invocations)
_nutrition_cache = {"data": None}

# Hardcoded USDA/ICMR per-100g values — fallback when a food is missing from the
# IFCT dataset. Mirrors the frontend NUTRITION_DB so backend and UI agree.
NUTRITION_DB = {
    # Grains & Pulses
    "Oats":            {"calories": 389, "protein_g": 16.9, "carbs_g": 66.3, "fat_g": 6.9,   "fiber_g": 10.6},
    "Jowar":           {"calories": 329, "protein_g": 11.3, "carbs_g": 72.1, "fat_g": 3.5,   "fiber_g": 6.3},
    "Buckwheat":       {"calories": 343, "protein_g": 13.3, "carbs_g": 71.5, "fat_g": 3.4,   "fiber_g": 10.0},
    "Quinoa":          {"calories": 368, "protein_g": 14.1, "carbs_g": 64.2, "fat_g": 6.1,   "fiber_g": 7.0},
    "White rice":      {"calories": 365, "protein_g": 7.1,  "carbs_g": 80.4, "fat_g": 0.7,   "fiber_g": 1.3},
    "Corn":            {"calories": 365, "protein_g": 9.4,  "carbs_g": 74.3, "fat_g": 4.7,   "fiber_g": 7.3},
    "Tapioca":         {"calories": 160, "protein_g": 0.7,  "carbs_g": 38.1, "fat_g": 0.3,   "fiber_g": 1.8},
    "Cassava":         {"calories": 160, "protein_g": 1.4,  "carbs_g": 38.1, "fat_g": 0.3,   "fiber_g": 1.8},
    "Peas":            {"calories": 81,  "protein_g": 5.4,  "carbs_g": 14.5, "fat_g": 0.4,   "fiber_g": 5.1},
    "Moong":           {"calories": 347, "protein_g": 23.9, "carbs_g": 63.0, "fat_g": 1.2,   "fiber_g": 16.3},
    # Vegetables
    "Potato":          {"calories": 77,  "protein_g": 2.0,  "carbs_g": 17.5, "fat_g": 0.1,   "fiber_g": 2.2},
    "Cauliflower":     {"calories": 25,  "protein_g": 1.9,  "carbs_g": 5.0,  "fat_g": 0.3,   "fiber_g": 2.0},
    "Capsicum":        {"calories": 27,  "protein_g": 1.0,  "carbs_g": 6.3,  "fat_g": 0.2,   "fiber_g": 2.1},
    "Cucumber":        {"calories": 15,  "protein_g": 0.7,  "carbs_g": 3.6,  "fat_g": 0.1,   "fiber_g": 0.5},
    "Tomato":          {"calories": 18,  "protein_g": 0.9,  "carbs_g": 3.9,  "fat_g": 0.2,   "fiber_g": 1.2},
    "Carrot":          {"calories": 41,  "protein_g": 0.9,  "carbs_g": 9.6,  "fat_g": 0.2,   "fiber_g": 2.8},
    "Onion":           {"calories": 40,  "protein_g": 1.1,  "carbs_g": 9.3,  "fat_g": 0.1,   "fiber_g": 1.7},
    "Asparagus":       {"calories": 20,  "protein_g": 2.2,  "carbs_g": 3.9,  "fat_g": 0.1,   "fiber_g": 2.1},
    "Oyster mushroom": {"calories": 33,  "protein_g": 3.3,  "carbs_g": 6.1,  "fat_g": 0.4,   "fiber_g": 2.3},
    "Sprout":          {"calories": 30,  "protein_g": 3.0,  "carbs_g": 5.9,  "fat_g": 0.2,   "fiber_g": 1.8},
    "Garlic":          {"calories": 149, "protein_g": 6.4,  "carbs_g": 33.1, "fat_g": 0.5,   "fiber_g": 2.1},
    # Fruits
    "Blueberry":       {"calories": 57,  "protein_g": 0.7,  "carbs_g": 14.5, "fat_g": 0.3,   "fiber_g": 2.4},
    "Cherry":          {"calories": 63,  "protein_g": 1.1,  "carbs_g": 16.0, "fat_g": 0.2,   "fiber_g": 2.1},
    "Kiwi":            {"calories": 61,  "protein_g": 1.1,  "carbs_g": 14.7, "fat_g": 0.5,   "fiber_g": 3.0},
    "Papaya":          {"calories": 43,  "protein_g": 0.5,  "carbs_g": 10.8, "fat_g": 0.3,   "fiber_g": 1.7},
    "Apple":           {"calories": 52,  "protein_g": 0.3,  "carbs_g": 13.8, "fat_g": 0.2,   "fiber_g": 2.4},
    "Pomegranate":     {"calories": 83,  "protein_g": 1.7,  "carbs_g": 18.7, "fat_g": 1.2,   "fiber_g": 4.0},
    "Raisins":         {"calories": 299, "protein_g": 3.1,  "carbs_g": 79.2, "fat_g": 0.5,   "fiber_g": 3.7},
    # Nuts & Seeds
    "Walnuts":         {"calories": 654, "protein_g": 15.2, "carbs_g": 13.7, "fat_g": 65.2,  "fiber_g": 6.7},
    "Pistachios":      {"calories": 562, "protein_g": 20.2, "carbs_g": 27.5, "fat_g": 45.3,  "fiber_g": 10.3},
    # Dairy & Substitutes
    "Ghee":            {"calories": 900, "protein_g": 0.0,  "carbs_g": 0.0,  "fat_g": 99.8,  "fiber_g": 0.0},
    "Tofu":            {"calories": 76,  "protein_g": 8.1,  "carbs_g": 1.9,  "fat_g": 4.8,   "fiber_g": 0.3},
    "Soy drink":       {"calories": 54,  "protein_g": 3.3,  "carbs_g": 6.3,  "fat_g": 1.8,   "fiber_g": 0.5},
    "Coconut milk":    {"calories": 230, "protein_g": 2.3,  "carbs_g": 6.0,  "fat_g": 23.8,  "fiber_g": 2.2},
    # Fish
    "Mackerel":        {"calories": 205, "protein_g": 18.6, "carbs_g": 0.0,  "fat_g": 13.9,  "fiber_g": 0.0},
    "Sardine":         {"calories": 208, "protein_g": 24.6, "carbs_g": 0.0,  "fat_g": 11.5,  "fiber_g": 0.0},
    "Herring":         {"calories": 158, "protein_g": 17.9, "carbs_g": 0.0,  "fat_g": 9.0,   "fiber_g": 0.0},
    "Trout":           {"calories": 148, "protein_g": 20.8, "carbs_g": 0.0,  "fat_g": 6.6,   "fiber_g": 0.0},
    # Spices
    "Curcumin":        {"calories": 354, "protein_g": 7.8,  "carbs_g": 64.9, "fat_g": 9.9,   "fiber_g": 21.1},
    # Others
    "Honey":           {"calories": 304, "protein_g": 0.3,  "carbs_g": 82.4, "fat_g": 0.0,   "fiber_g": 0.2},
    "Olive oil":       {"calories": 884, "protein_g": 0.0,  "carbs_g": 0.0,  "fat_g": 100.0, "fiber_g": 0.0},
    "Soybean oil":     {"calories": 884, "protein_g": 0.0,  "carbs_g": 0.0,  "fat_g": 100.0, "fiber_g": 0.0},
    "Whey protein":    {"calories": 352, "protein_g": 78.1, "carbs_g": 10.4, "fat_g": 4.2,   "fiber_g": 0.0},
    "Popcorn":         {"calories": 387, "protein_g": 12.9, "carbs_g": 77.9, "fat_g": 4.5,   "fiber_g": 14.5},
    "Orange juice":      {"calories": 45,  "protein_g": 0.7,  "carbs_g": 10.4, "fat_g": 0.2,   "fiber_g": 0.2},
    "Chokeberry":        {"calories": 47,  "protein_g": 1.3,  "carbs_g": 9.6,  "fat_g": 0.5,   "fiber_g": 5.3},
    "Kefir":             {"calories": 61,  "protein_g": 3.4,  "carbs_g": 4.7,  "fat_g": 3.3,   "fiber_g": 0.0},
    "Psyllium":          {"calories": 340, "protein_g": 2.4,  "carbs_g": 88.9, "fat_g": 1.0,   "fiber_g": 85.7},
    "Lady's finger":     {"calories": 33,  "protein_g": 1.9,  "carbs_g": 7.5,  "fat_g": 0.2,   "fiber_g": 3.2},
    "Ladies finger":     {"calories": 33,  "protein_g": 1.9,  "carbs_g": 7.5,  "fat_g": 0.2,   "fiber_g": 3.2},
    "Lady finger":       {"calories": 33,  "protein_g": 1.9,  "carbs_g": 7.5,  "fat_g": 0.2,   "fiber_g": 3.2},
    "Okra":              {"calories": 33,  "protein_g": 1.9,  "carbs_g": 7.5,  "fat_g": 0.2,   "fiber_g": 3.2},
    "Green peas":        {"calories": 81,  "protein_g": 5.4,  "carbs_g": 14.5, "fat_g": 0.4,   "fiber_g": 5.1},
    "Beetroot juice":    {"calories": 45,  "protein_g": 1.7,  "carbs_g": 9.9,  "fat_g": 0.1,   "fiber_g": 2.0},
    "Grape fruit juice": {"calories": 38,  "protein_g": 0.5,  "carbs_g": 9.2,  "fat_g": 0.1,   "fiber_g": 0.1},
    "Green tea":         {"calories": 1,   "protein_g": 0.2,  "carbs_g": 0.0,  "fat_g": 0.0,   "fiber_g": 0.0},
    "Oolong tea":        {"calories": 1,   "protein_g": 0.0,  "carbs_g": 0.3,  "fat_g": 0.0,   "fiber_g": 0.0},
    "Fresh cream":       {"calories": 345, "protein_g": 2.8,  "carbs_g": 2.8,  "fat_g": 37.0,  "fiber_g": 0.0},
    "Kimchi":            {"calories": 15,  "protein_g": 1.1,  "carbs_g": 2.4,  "fat_g": 0.5,   "fiber_g": 1.6},
    "Arrowroot":         {"calories": 357, "protein_g": 0.3,  "carbs_g": 88.2, "fat_g": 0.1,   "fiber_g": 3.4},
}


def _lookup_nutrition_db(food_name: str):
    """Fallback nutrition lookup against the hardcoded NUTRITION_DB (USDA/ICMR).
    Returns a dict shaped like an IFCT entry ({"per_100g": {...}}) or None.
    Exact name match first, then partial — mirrors the frontend calcNutrition."""
    if not food_name:
        return None
    name = food_name.lower()
    for key, val in NUTRITION_DB.items():
        if key.lower() == name:
            return {"per_100g": val}
    for key, val in NUTRITION_DB.items():
        kl = key.lower()
        if name in kl or kl in name:
            return {"per_100g": val}
    return None


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else event.get("body", {})
        kit_id = body.get("kit_id", "").strip()

        if not kit_id:
            return _response(400, {"error": "kit_id is required"})

        logger.info(f"Generating meal plan for kit_id: {kit_id}")

        # Step 1: Load patient data
        patient = _load_patient_data(kit_id)
        if not patient:
            return _response(404, {"error": f"No patient data found for {kit_id}"})

        # Step 2: Load nutrition dataset
        nutrition_data = _load_nutrition_data()

        # Step 3: Deterministic lookup — approved foods based on patient constraints
        approved_foods = _get_approved_foods(patient, nutrition_data)

        # Step 4: Generate meal plan via Bedrock
        meal_plan = _generate_meal_plan(patient, approved_foods)

        # Step 5: Enrich with nutrition data
        enriched_plan = _enrich_with_nutrition(meal_plan, nutrition_data)

        # Step 6: Save unique recipes to the database
        _save_recipes_to_db(enriched_plan)

        # Step 7: Save to DynamoDB
        _save_meal_plan_to_db(kit_id, patient, enriched_plan)

        # Personalized targets for the response (deterministic — matches the prompt)
        calorie_target, _weight_note, macro_targets = _calculate_calorie_target(patient)

        return _response(200, {
            "kit_id": kit_id,
            "generated_at": datetime.utcnow().isoformat(),
            "calorie_target": calorie_target,
            "macro_targets": macro_targets,
            "patient_summary": {
                "name": patient.get("name", ""),
                "diet_type": patient.get("diet_type", ""),
                "avoid_list": patient.get("avoid_list", []),
                "bmi": patient.get("bmi", ""),
                "ibs_type": patient.get("ibs_info", {}).get("subtype", ""),
            },
            "meal_plan": enriched_plan,
        })

    except Exception as e:
        logger.error(f"Error generating meal plan: {e}", exc_info=True)
        return _response(500, {"error": str(e)})


# ═══════════════════════════════════════════════════════════
# Data Loading
# ═══════════════════════════════════════════════════════════

def _load_patient_data(kit_id: str) -> dict:
    """Load and parse patient iom_data from S3."""
    try:
        obj = s3.get_object(Bucket=DATA_BUCKET, Key=f"patients/{kit_id}.json")
        raw_data = json.loads(obj["Body"].read().decode("utf-8"))
        return _parse_iom_data(raw_data, kit_id)
    except Exception as e:
        logger.error(f"Failed to load patient {kit_id}: {e}")
        return None


def _get_field(metadata: dict, *keys):
    """Return the first non-empty value among the given metadata keys."""
    for key in keys:
        value = metadata.get(key)
        if value not in (None, ""):
            return value
    return ""


def _parse_iom_data(data: dict, kit_id: str) -> dict:
    """Extract key fields from iom_data.json."""
    metadata = data.get("metadata", {})
    tokens = data.get("tokens", {})

    product_type = data.get("product_type", "GutHeal")

    allergies_raw = _get_field(
        metadata,
        "Do you have food allergies or intolerances?",
        "Do you have any food allergies or intolerances?",
        "Do you have any known allergies?",
    )
    avoid_list = []
    if allergies_raw and allergies_raw.lower() not in ["no", "none", ""]:
        avoid_list = [item.strip().lower() for item in allergies_raw.replace("(legumes)", "").split(",") if item.strip()]

    # Parse bacteria targets
    bacteria_increase = []
    bacteria_decrease = []
    try:
        bacteria_raw = json.loads(tokens.get("#TID009", "[]"))
        for b in bacteria_raw:
            if b.get("Category") != "Bacteria":
                continue
            token_name = b.get("Token_name", "")
            # Skip summary rows (not real bacteria)
            if any(s in token_name for s in ("Other", "all", "bot", "top", "Non")):
                continue
            entry = {"name": b.get("Token_name", ""), "description": b.get("Description", "")}
            if b.get("Type") == "increase":
                bacteria_increase.append(entry)
            elif b.get("Type") == "decrease":
                bacteria_decrease.append(entry)
    except (json.JSONDecodeError, TypeError):
        pass

    # Parse food_list (take / avoid)
    yes_foods = []
    avoid_foods = []
    yes_by_group = {}
    avoid_by_group = {}
    food_list = data.get("food_list")
    if food_list:
        for item in food_list:
            food_item = item.get("Food Item", "")
            food_group = item.get("Food Group", "")
            final_call = item.get("final_call", "")
            if final_call == "take":
                yes_foods.append(food_item)
                yes_by_group.setdefault(food_group, []).append(food_item)
            elif final_call == "avoid":
                avoid_foods.append(food_item)
                avoid_by_group.setdefault(food_group, []).append(food_item)
    else:
        logger.warning(f"No food_list found in patient data for kit_id: {kit_id}")

    return {
        "kit_id": kit_id,
        "name": _get_field(metadata, "Name", "Full Name"),
        "gender": metadata.get("Gender", ""),
        "age": metadata.get("Age", ""),
        "weight_kg": metadata.get("Weight", ""),
        "height_cm": metadata.get("Height", ""),
        "bmi": metadata.get("BMI", ""),
        "location": _get_field(metadata, "Location", "Location(City)"),
        "diet_type": _get_field(
            metadata,
            "Which best describes your usual diet",
            "Please describe your diet:",
            "Please describe your diet::",
        ) or "Veg",
        "product_type": product_type,
        "avoid_list": avoid_list,
        "ibs_info": {
            "subtype": metadata.get("Do you know which subtype of IBS you have?", ""),
            "severity_level": metadata.get("IBS Severity Level", ""),
        },
        "prebiotics": metadata.get("Prebiotics - Gut affectors", ""),
        "bacteria_to_increase": bacteria_increase,
        "bacteria_to_decrease": bacteria_decrease,
        "yes_foods": yes_foods,
        "avoid_foods": avoid_foods,
        "yes_by_group": yes_by_group,
        "avoid_by_group": avoid_by_group,
        "symptoms": {
            field: metadata.get(field, "Not Severe")
            for field in ["Anxiety", "Stress", "Flatulence/Bloating", "Acid Reflux", "Disturbed Sleep"]
        },
    }


def _load_nutrition_data() -> list:
    """Load Indian nutrition dataset from S3 (cached)."""
    if _nutrition_cache["data"]:
        return _nutrition_cache["data"]

    try:
        obj = s3.get_object(Bucket=DATA_BUCKET, Key="nutrition/indian_nutrition_dataset.json")
        raw_data = json.loads(obj["Body"].read().decode("utf-8"))
        # Deduplicate by food_id keeping first occurrence, drop corrupt nutrition values
        seen_ids = set()
        clean_data = []
        for item in raw_data:
            if item["food_id"] in seen_ids:
                continue
            if item.get("per_100g", {}).get("calories", 0) >= 50:
                seen_ids.add(item["food_id"])
                clean_data.append(item)
        logger.info(f"IFCT loaded: {len(raw_data)} raw → {len(clean_data)} clean items")
        _nutrition_cache["data"] = clean_data
        return clean_data
    except Exception as e:
        logger.error(f"Failed to load nutrition data: {e}")
        return []


# ═══════════════════════════════════════════════════════════
# Approved Food Lookup
# ═══════════════════════════════════════════════════════════

def _get_approved_foods(patient: dict, nutrition_data: list) -> dict:
    """
    Returns all patient yes_foods organized for the LLM prompt.
    No caps — every approved food reaches the LLM.
    Returns a dict with 'by_group' (grouped by food group) and
    'ifct_lookup' (nutrition for foods that have IFCT matches).
    """
    yes_by_group = patient.get("yes_by_group", {})
    avoid_foods = set(a.lower() for a in patient.get("avoid_foods", []) + patient.get("avoid_list", []) if a)

    # Build IFCT nutrition lookup keyed by simple food name
    ifct_lookup = {}
    for food_name in patient.get("yes_foods", []):
        if not food_name:
            continue
        fn_lower = food_name.lower()
        # Skip if in avoid list
        if fn_lower in avoid_foods:
            continue
        # Find first reliable IFCT match (cal >= 50)
        for item in nutrition_data:
            item_lower = item["name_en"].lower()
            if fn_lower in item_lower or item_lower in fn_lower:
                n = item.get("per_100g", {})
                if n.get("calories", 0) >= 50:
                    ifct_lookup[food_name] = {
                        "calories_per_100g": n["calories"],
                        "protein_g": n["protein_g"],
                        "carbs_g": n["carbs_g"],
                        "fat_g": n["fat_g"],
                        "fiber_g": n["fiber_g"],
                    }
                    break  # one match per food name, no duplicates

    # Filter avoid foods from yes_by_group
    clean_by_group = {}
    for group, foods in yes_by_group.items():
        clean = [f for f in foods if f.lower() not in avoid_foods]
        if clean:
            clean_by_group[group] = clean

    return {"by_group": clean_by_group, "ifct_lookup": ifct_lookup}


# ═══════════════════════════════════════════════════════════
# Meal Plan Generation via Bedrock
# ═══════════════════════════════════════════════════════════

def _calculate_calorie_target(patient: dict) -> tuple:
    """
    Calculate personalized calorie target using Mifflin-St Jeor equation.
    Falls back to BMI-based buckets if data is missing.
    Returns (calorie_target, weight_note, macro_targets)
    """
    try:
        weight_kg = float(patient.get("weight_kg") or 0)
        height_cm = float(patient.get("height_cm") or 0)
        age = int(patient.get("age") or 0)
        gender = str(patient.get("gender") or "").lower()
        bmi = float(patient.get("bmi") or 0)

        if weight_kg > 0 and height_cm > 0 and age > 0 and gender:
            # Mifflin-St Jeor BMR
            if gender.startswith("f"):
                bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
            else:
                bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5

            # Activity factor from patient data (default light)
            activity_raw = str(patient.get("metadata_activity", "")).lower()
            if "sedentary" in activity_raw or "0-2" in activity_raw:
                activity_factor = 1.2
                activity_label = "sedentary"
            elif "moderate" in activity_raw or "5-7" in activity_raw:
                activity_factor = 1.55
                activity_label = "moderate activity"
            else:
                activity_factor = 1.375
                activity_label = "light activity"

            tdee = int(bmr * activity_factor)

            # Adjust for BMI goal
            if bmi < 18.5:
                calorie_target = tdee + 400  # surplus for weight gain
                weight_note = f"UNDERWEIGHT (BMI {bmi:.1f}). Target {calorie_target} kcal to support healthy weight gain."
            elif bmi > 25:
                calorie_target = max(tdee - 300, 1400)  # mild deficit
                weight_note = f"OVERWEIGHT (BMI {bmi:.1f}). Target {calorie_target} kcal for gradual weight management."
            else:
                calorie_target = tdee
                weight_note = f"NORMAL weight (BMI {bmi:.1f}). Target {calorie_target} kcal to maintain weight."

        else:
            # Fallback to BMI buckets
            bmi = bmi or 22
            if bmi < 18.5:
                calorie_target = 2200
                weight_note = f"UNDERWEIGHT (BMI {bmi:.1f}). Prioritize calorie-dense, nutrient-rich foods."
            elif bmi > 25:
                calorie_target = 1600
                weight_note = f"OVERWEIGHT (BMI {bmi:.1f}). Focus on low-calorie, high-fiber foods."
            else:
                calorie_target = 1800
                weight_note = f"NORMAL weight (BMI {bmi:.1f})."

        # Calculate macro targets based on calorie_target and diet type
        diet = str(patient.get("diet_type", "")).lower()
        product = str(patient.get("product_type", "GutHeal"))
        ibs_type = str(patient.get("ibs_info", {}).get("subtype", "")).lower()

        # IBS-D: moderate fiber (excess worsens diarrhoea)
        # SEnS/Pescatarian: higher protein for energy and recovery
        if "diarrhoea" in ibs_type or "diarrhea" in ibs_type:
            protein_pct, carb_pct, fat_pct = 0.20, 0.55, 0.25
            fiber_g = 20  # lower for IBS-D
        elif "pescatarian" in diet or "fish" in diet:
            protein_pct, carb_pct, fat_pct = 0.25, 0.50, 0.25
            fiber_g = 30
        else:
            protein_pct, carb_pct, fat_pct = 0.18, 0.57, 0.25
            fiber_g = 30

        macro_targets = {
            "protein_g": int(calorie_target * protein_pct / 4),
            "carbs_g": int(calorie_target * carb_pct / 4),
            "fat_g": int(calorie_target * fat_pct / 9),
            "fiber_g": fiber_g,
        }

        return calorie_target, weight_note, macro_targets

    except Exception as e:
        logger.warning(f"Calorie calc error: {e}, using defaults")
        return 1800, "NORMAL weight.", {"protein_g": 60, "carbs_g": 250, "fat_g": 50, "fiber_g": 30}


def _call_bedrock(prompt: str) -> str:
    """
    LLM routing:
    1. Mistral Small (testing — set MISTRAL_API_KEY)
    2. AWS Bedrock Nova Micro (production — default)
    """
    import urllib.request

    # 1. Mistral — fast, free tier
    mistral_key = os.environ.get('MISTRAL_API_KEY', '')
    if mistral_key:
        try:
            payload = json.dumps({
                'model': 'mistral-small-latest',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 4000,
                'temperature': 0.7
            }).encode()
            req = urllib.request.Request(
                'https://api.mistral.ai/v1/chat/completions',
                data=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {mistral_key}'
                }
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read())
                return result['choices'][0]['message']['content']
        except Exception as e:
            logger.warning(f'Mistral failed: {e}, falling to Bedrock')

    # 2. AWS Bedrock — production
    response = bedrock.converse(
        modelId=LLM_MODEL_ID,
        messages=[{'role': 'user', 'content': [{'text': prompt}]}],
        inferenceConfig={'maxTokens': 5000, 'temperature': 0.7, 'topP': 0.9}
    )
    return response['output']['message']['content'][0]['text']


def _generate_meal_plan(patient: dict, approved_foods: dict) -> dict:
    """Generate a 1-day meal plan using Amazon Nova Micro via the Bedrock Converse API."""

    # Determine personalized calorie + macro targets (Mifflin-St Jeor)
    calorie_target, weight_note, macro_targets = _calculate_calorie_target(patient)

    product_type = patient.get("product_type", "GutHeal")
    bmi = patient.get("bmi", "")
    gender = patient.get("gender", "")
    age = patient.get("age", "")

    # Build compact food context — names only by group
    by_group = approved_foods.get("by_group", {})
    food_lines = []
    for group, foods in by_group.items():
        food_lines.append(f"{group}: {', '.join(foods)}")
    food_context = '\n'.join(food_lines)

    # Allergies only — yes list enforces all other avoids
    allergy_str = ', '.join(patient.get('avoid_list', [])) or 'None'

    # Bacteria names only
    increase_names = ', '.join([b['name'] for b in patient.get('bacteria_to_increase', [])])

    # Product context one line
    if product_type == 'SEnS':
        health_ctx = f"Focus: Sleep/Energy/Stress. Support bacteria: {increase_names}"
    else:
        ibs_sub = patient.get('ibs_info', {}).get('subtype', 'IBS')
        health_ctx = f"Condition: {ibs_sub}. Support bacteria: {increase_names}"

    prompt = f"""Indian clinical nutritionist. Generate 1-day meal plan as JSON only.

PATIENT: {patient['diet_type']}, BMI {bmi}, {gender}, {age}y. {weight_note}
HEALTH: {health_ctx}
TARGET: {calorie_target} kcal (protein {macro_targets['protein_g']}g, carbs {macro_targets['carbs_g']}g, fat {macro_targets['fat_g']}g, fiber {macro_targets['fiber_g']}g)

APPROVED FOODS — use ONLY these, nothing else:
{food_context}

NEVER USE (allergies): {allergy_str}

RULES:
1. Every ingredient MUST be from the APPROVED FOODS list above.
2. Traditional Indian household recipes — use authentic names (Upma, Khichdi, Sabzi, Dal, Curry, Raita etc).
3. Accurate nutrition per quantity using USDA/ICMR values. Medical application.
4. Total daily calories within 10% of target.
5. USE VARIETY — each meal must use different foods from the approved list. Do not repeat the same ingredient across more than 2 meals. Spread across all food groups present.
6. BALANCE — breakfast should be light, lunch heaviest, dinner light. Snacks under 200 kcal.
7. Return ONLY valid JSON — no text before or after.

OUTPUT: {{"calorie_target":{calorie_target},"day_1":{{"breakfast":{{"name":"","serving_size":"","accompaniments":[],"ingredients":[{{"name":"","quantity_g":0,"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0}}],"total_calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"prep_time_min":0,"benefits":""}},"mid_morning_snack":{{...}},"lunch":{{...}},"evening_snack":{{...}},"dinner":{{...}}}}}}"""

    try:
        content = _call_bedrock(prompt)

        # Extract JSON from response
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            raw_json = content[json_start:json_end]
            try:
                meal_plan = json.loads(raw_json)
            except json.JSONDecodeError:
                # Repair truncated JSON from small models
                open_braces = raw_json.count('{') - raw_json.count('}')
                open_brackets = raw_json.count('[') - raw_json.count(']')
                repaired = raw_json.rstrip(',\n\r\t ') + (']' * max(0, open_brackets)) + ('}' * max(0, open_braces))
                try:
                    meal_plan = json.loads(repaired)
                    logger.info('JSON repaired successfully')
                except json.JSONDecodeError as e2:
                    logger.error(f'JSON repair failed: {e2}')
                    raise
            return meal_plan

        logger.error(f"No valid JSON found in LLM response: {content[:200]}")
        return _generate_fallback_plan(patient, approved_foods, calorie_target)

    except Exception as e:
        logger.error(f"Bedrock invocation failed: {e}", exc_info=True)
        return _generate_fallback_plan(patient, approved_foods, calorie_target)


def _generate_fallback_plan(patient: dict, foods, calorie_target: int) -> dict:
    yes_by_group = patient.get('yes_by_group', {})
    yes_foods = patient.get('yes_foods', [])
    # Handle both old list format and new dict format for foods param
    ifct_lookup = foods.get('ifct_lookup', {}) if isinstance(foods, dict) else {}

    if not yes_foods:
        return _unavailable_plan(calorie_target)

    grains = yes_by_group.get('Grains & Pulses', [])
    vegs = yes_by_group.get('Vegetables', [])
    fruits = yes_by_group.get('Fruits', [])
    dairy = yes_by_group.get('Dairy and Substitutes', [])
    nuts = yes_by_group.get('Dry Fruits and Nuts', [])
    fish = yes_by_group.get('Meat, Fish & Poultry', [])
    spices = yes_by_group.get('Spices', [])

    def get_nut(food, qty=100):
        n = ifct_lookup.get(food, {})
        s = qty / 100
        if n:
            return {'total_calories': round(n.get('calories_per_100g', 0) * s),
                    'protein_g': round(n.get('protein_g', 0) * s, 1),
                    'carbs_g': round(n.get('carbs_g', 0) * s, 1),
                    'fat_g': round(n.get('fat_g', 0) * s, 1),
                    'fiber_g': round(n.get('fiber_g', 0) * s, 1)}
        return {'total_calories': 0, 'protein_g': 0, 'carbs_g': 0, 'fat_g': 0, 'fiber_g': 0}

    def meal(name, ings, benefits):
        ingredients = []
        totals = {'total_calories': 0, 'protein_g': 0, 'carbs_g': 0, 'fat_g': 0, 'fiber_g': 0}
        for food, qty in ings:
            if not food: continue
            n = get_nut(food, qty)
            ingredients.append({'name': food, 'quantity_g': qty})
            for k in totals: totals[k] = round(totals[k] + n[k], 1)
        return {'name': name, 'serving_size': '1 serving', 'accompaniments': [],
                'ingredients': ingredients, 'prep_time_min': 15,
                'benefits': benefits, 'nutrition_source': 'fallback', **totals}

    g1 = grains[0] if grains else yes_foods[0]
    g2 = grains[1] if len(grains) > 1 else g1
    g3 = grains[2] if len(grains) > 2 else g1
    v1 = vegs[0] if vegs else g1
    v2 = vegs[1] if len(vegs) > 1 else v1
    v3 = vegs[2] if len(vegs) > 2 else v1
    f1 = fruits[0] if fruits else (nuts[0] if nuts else g1)
    f2 = fruits[1] if len(fruits) > 1 else f1
    n1 = nuts[0] if nuts else (fruits[0] if fruits else g1)
    sp = spices[0] if spices else ''
    ghee = 'Ghee' if 'Ghee' in dairy else (dairy[0] if dairy else '')
    ghee_ing = [(ghee, 5)] if ghee else []
    fish1 = fish[0] if fish else ''

    return {'calorie_target': calorie_target, 'day_1': {
        'note': 'Suggested plan from your approved foods. Regenerate for AI-personalized recipes.',
        'breakfast': meal(
            f'{g1} Porridge{(" with " + sp) if sp else ""}',
            [(g1, 80), (v1, 50)] + ghee_ing,
            f'Gut-friendly breakfast using approved {g1}.'
        ),
        'mid_morning_snack': meal(
            f'Fresh {f1} with {n1}',
            [(f1, 100), (n1, 25)],
            'Light snack from approved fruits and nuts.'
        ),
        'lunch': meal(
            f'{g2} with {v1} and {v2}{(" and " + ghee) if ghee else ""}',
            [(g2, 100), (v1, 80), (v2, 60)] + ghee_ing,
            'Balanced lunch using approved grains and vegetables.'
        ),
        'evening_snack': meal(
            f'{fish1} preparation{(" with " + sp) if sp else ""}' if fish1 else f'{f2} with {n1}',
            [(fish1, 100), (v3, 40)] if fish1 else [(f2, 80), (n1, 20)],
            'Protein-rich snack.' if fish1 else 'Light evening snack.'
        ),
        'dinner': meal(
            f'{g3} Khichdi with {v2}{(" and " + ghee) if ghee else ""}',
            [(g3, 80), (v2, 60), (v3, 40)] + ghee_ing,
            'Light dinner. Easy to digest for gut health.'
        ),
    }}


def _unavailable_plan(calorie_target: int) -> dict:
    msg = "Service temporarily unavailable. Please contact your IOM nutritionist."
    empty = {"name": msg, "serving_size": "N/A", "accompaniments": [],
             "ingredients": [], "total_calories": 0, "protein_g": 0,
             "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "prep_time_min": 0,
             "benefits": msg, "nutrition_source": "unavailable"}
    return {"calorie_target": calorie_target, "day_1": {
        "note": msg, "breakfast": empty, "mid_morning_snack": empty,
        "lunch": empty, "evening_snack": empty, "dinner": empty
    }}


# ═══════════════════════════════════════════════════════════
# Nutrition Enrichment
# ═══════════════════════════════════════════════════════════

def _enrich_with_nutrition(plan: dict, nutrition_data: list) -> dict:
    """Add detailed nutrition data for each ingredient from IFCT database."""
    food_lookup = {f["food_id"]: f for f in nutrition_data}
    name_lookup = {f["name_en"].lower(): f for f in nutrition_data}

    for day_key in ["day_1"]:
        day = plan.get(day_key, {})
        if not isinstance(day, dict):
            continue

        daily_totals = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0}

        for meal_type in ["breakfast", "mid_morning_snack", "lunch", "evening_snack", "dinner"]:
            meal = day.get(meal_type, {})
            if not isinstance(meal, dict):
                continue

            # Enrich ingredients with nutrition data (informational / display only —
            # the LLM-provided meal totals are NOT overridden)
            for ing in meal.get("ingredients", []):
                food_id = ing.get("food_id", "")
                food_name = ing.get("name", "").lower()

                nutrition_info = food_lookup.get(food_id)
                if not nutrition_info:
                    nutrition_info = name_lookup.get(food_name)
                if not nutrition_info:
                    # Fallback to hardcoded USDA/ICMR values for foods absent from IFCT
                    nutrition_info = _lookup_nutrition_db(ing.get("name", ""))

                if nutrition_info:
                    qty = ing.get("quantity_g", 100)
                    multiplier = float(qty) / 100.0
                    ing_cal = round(nutrition_info["per_100g"]["calories"] * multiplier, 1)
                    ing_pro = round(nutrition_info["per_100g"]["protein_g"] * multiplier, 1)
                    ing_carb = round(nutrition_info["per_100g"]["carbs_g"] * multiplier, 1)
                    ing_fat = round(nutrition_info["per_100g"]["fat_g"] * multiplier, 1)
                    ing_fib = round(nutrition_info["per_100g"]["fiber_g"] * multiplier, 1)

                    ing["nutrition_per_serving"] = {
                        "calories": ing_cal,
                        "protein_g": ing_pro,
                        "carbs_g": ing_carb,
                        "fat_g": ing_fat,
                        "fiber_g": ing_fib,
                    }

                    if nutrition_info.get("micronutrients"):
                        ing["micronutrients"] = {
                            k: round(v * multiplier, 2)
                            for k, v in nutrition_info["micronutrients"].items()
                        }

            # Nova Micro (USDA/ICMR-trained) is the SOLE source of meal-level nutrition.
            # IFCT name-matching is too unreliable to override these values.
            meal["nutrition_source"] = "LLM"

            # If LLM returned 0 for meal totals, calculate from ingredients
            if not meal.get('total_calories'):
                meal['total_calories'] = round(sum(
                    ing.get('nutrition_per_serving', {}).get('calories', 0)
                    for ing in meal.get('ingredients', [])
                ))
                meal['protein_g'] = round(sum(
                    ing.get('nutrition_per_serving', {}).get('protein_g', 0)
                    for ing in meal.get('ingredients', [])
                ), 1)
                meal['carbs_g'] = round(sum(
                    ing.get('nutrition_per_serving', {}).get('carbs_g', 0)
                    for ing in meal.get('ingredients', [])
                ), 1)
                meal['fat_g'] = round(sum(
                    ing.get('nutrition_per_serving', {}).get('fat_g', 0)
                    for ing in meal.get('ingredients', [])
                ), 1)
                meal['fiber_g'] = round(sum(
                    ing.get('nutrition_per_serving', {}).get('fiber_g', 0)
                    for ing in meal.get('ingredients', [])
                ), 1)
                meal['nutrition_source'] = 'USDA_calculated'

            # Accumulate daily totals
            daily_totals["calories"] += meal.get("total_calories", 0)
            daily_totals["protein_g"] += meal.get("protein_g", 0)
            daily_totals["carbs_g"] += meal.get("carbs_g", 0)
            daily_totals["fat_g"] += meal.get("fat_g", 0)
            daily_totals["fiber_g"] += meal.get("fiber_g", 0)

        plan[day_key]["daily_totals"] = daily_totals

    return plan


def _save_meal_plan_to_db(kit_id: str, patient: dict, meal_plan: dict):
    """Save the fully generated meal plan to DynamoDB."""
    try:
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(MEAL_PLANS_TABLE)
        
        from datetime import datetime
        import json
        from decimal import Decimal
        
        timestamp = datetime.utcnow().isoformat()

        # Targets for history display / restore
        calorie_target, _weight_note, macro_targets = _calculate_calorie_target(patient)

        # We need to convert floats to Decimals for DynamoDB
        item_data = {
            "kit_id": kit_id,
            "created_at": timestamp,
            "generated_at": timestamp,
            "diet_type": patient.get("diet_type", ""),
            "calorie_target": calorie_target,
            "macro_targets": macro_targets,
            "patient_summary": {
                "name": patient.get("name", ""),
                "diet_type": patient.get("diet_type", ""),
                "avoid_list": patient.get("avoid_list", []),
                "ibs_type": patient.get("ibs_info", {}).get("subtype", "")
            },
            "meal_plan": meal_plan
        }
        
        # Parse through JSON to convert floats to Decimals seamlessly
        item_json = json.dumps(item_data)
        item_dict = json.loads(item_json, parse_float=Decimal)
        
        table.put_item(Item=item_dict)
        logger.info(f"Successfully saved meal plan for {kit_id} to DynamoDB.")
    except Exception as e:
        logger.error(f"Failed to save meal plan to DynamoDB: {e}")
        # We catch and log, but do not fail the generation response
        pass


def _save_recipes_to_db(meal_plan: dict):
    """Save unique generated meals to the custom recipes table."""
    try:
        import uuid
        from datetime import datetime, timezone
        from decimal import Decimal
        
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(RECIPES_TABLE)
        saved_names = set()

        for day_key in ["day_1"]:
            day = meal_plan.get(day_key, {})
            if not isinstance(day, dict):
                continue

            for meal_type in ["breakfast", "mid_morning_snack", "lunch", "evening_snack", "dinner"]:
                meal = day.get(meal_type, {})
                if not isinstance(meal, dict):
                    continue
                    
                name = meal.get("name")
                if not name or name in saved_names:
                    continue
                    
                saved_names.add(name)
                
                recipe_id = "RECIPE#" + str(uuid.uuid4())
                
                item_data = {
                    "recipe_id": recipe_id,
                    "name": name,
                    "ingredients": meal.get("ingredients", []),
                    "total_calories": meal.get("total_calories", 0),
                    "protein_g": meal.get("protein_g", 0),
                    "carbs_g": meal.get("carbs_g", 0),
                    "fat_g": meal.get("fat_g", 0),
                    "fiber_g": meal.get("fiber_g", 0),
                    "serving_size": meal.get("serving_size", "1 serving"),
                    "accompaniments": meal.get("accompaniments", []),
                    "benefits": meal.get("benefits", "AI Generated Meal Plan Recipe"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": "MealPlanGenerator"
                }
                
                item_json = json.dumps(item_data)
                item_dict = json.loads(item_json, parse_float=Decimal)
                table.put_item(Item=item_dict)
    except Exception as e:
        logger.warning(f"Failed to save recipes to DB: {e}")


# ═══════════════════════════════════════════════════════════
# HTTP Response
# ═══════════════════════════════════════════════════════════

def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }
