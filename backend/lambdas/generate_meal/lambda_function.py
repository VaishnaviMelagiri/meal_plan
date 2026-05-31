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
        relevant_foods = _get_approved_foods(patient, nutrition_data)

        # Step 4: Generate meal plan via Bedrock
        meal_plan = _generate_meal_plan(patient, relevant_foods)

        # Step 5: Enrich with nutrition data
        enriched_plan = _enrich_with_nutrition(meal_plan, nutrition_data)

        # Step 6: Save unique recipes to the database
        _save_recipes_to_db(enriched_plan)

        # Step 7: Save to DynamoDB
        _save_meal_plan_to_db(kit_id, patient, enriched_plan)

        return _response(200, {
            "kit_id": kit_id,
            "generated_at": datetime.utcnow().isoformat(),
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
        data = json.loads(obj["Body"].read().decode("utf-8"))
        _nutrition_cache["data"] = data
        return data
    except Exception as e:
        logger.error(f"Failed to load nutrition data: {e}")
        return []


# ═══════════════════════════════════════════════════════════
# Approved Food Lookup
# ═══════════════════════════════════════════════════════════

def _get_approved_foods(patient: dict, nutrition_data: list) -> list:
    """Deterministically select the foods to offer the LLM.

    Prefers the patient's parsed yes_foods (case-insensitive partial match against
    the IFCT dataset), falling back to a diet-filtered slice for older JSON without
    a food_list. Always strips anything in the patient's avoid_foods.
    """
    avoid_foods = [a.lower() for a in patient.get("avoid_foods", []) if a]

    def _is_avoided(name_en: str) -> bool:
        name_lower = name_en.lower()
        for avoid in avoid_foods:
            if avoid and (avoid in name_lower or name_lower in avoid):
                return True
        return False

    yes_foods = patient.get("yes_foods", [])
    approved = []

    if yes_foods:
        for food_name in yes_foods:
            if not food_name:
                continue
            fn_lower = food_name.lower()
            matched = False
            for item in nutrition_data:
                item_name_lower = item["name_en"].lower()
                if fn_lower in item_name_lower or item_name_lower in fn_lower:
                    approved.append(dict(item))
                    matched = True
            # No IFCT match — still pass the food through so the LLM estimates nutrition
            if not matched:
                approved.append({"name_en": food_name, "ifct_match": False})
    else:
        # Old JSON without food_list — filter IFCT by diet + avoid list
        diet_type = patient.get("diet_type", "") or ""
        is_veg = "veg" in diet_type.lower()
        for item in nutrition_data:
            if is_veg and item.get("category") == "Meat, Fish & Poultry":
                continue
            if _is_avoided(item["name_en"]):
                continue
            approved.append(dict(item))
            if len(approved) >= 25:
                break

    # Safety net: drop anything matching the avoid list
    approved = [item for item in approved if not _is_avoided(item.get("name_en", ""))]

    return approved[:25]


# ═══════════════════════════════════════════════════════════
# Meal Plan Generation via Bedrock
# ═══════════════════════════════════════════════════════════

def _generate_meal_plan(patient: dict, relevant_foods: list) -> dict:
    """Generate a 1-day meal plan using Amazon Nova Micro via the Bedrock Converse API."""

    # Build food context for the prompt
    food_lines = []
    for f in relevant_foods[:15]:
        if f.get("ifct_match") is False or "per_100g" not in f:
            # No IFCT nutrition data — tell the LLM to estimate
            food_lines.append(f"- APPROVED: {f['name_en']} (nutrition estimated)")
        else:
            food_lines.append(
                f"- APPROVED: {f['name_en']} ({f['category']}): {f['per_100g']['calories']} kcal, "
                f"protein {f['per_100g']['protein_g']}g, carbs {f['per_100g']['carbs_g']}g, "
                f"fat {f['per_100g']['fat_g']}g, fiber {f['per_100g']['fiber_g']}g per 100g. "
                f"Dishes: {', '.join(f.get('common_dishes', [])[:3])}"
            )
    food_context = "\n".join(food_lines)

    # Build bacteria context
    increase_context = "\n".join([
        f"- Increase {b['name']}: {b['description'][:100]}..."
        for b in patient.get("bacteria_to_increase", [])[:5]
        if "Other" not in b["name"]
    ])
    decrease_context = "\n".join([
        f"- Decrease {b['name']}: {b['description'][:100]}..."
        for b in patient.get("bacteria_to_decrease", [])[:5]
        if "Other" not in b["name"]
    ])

    # Determine calorie target based on BMI
    bmi = float(patient.get("bmi", "20") or "20")
    if bmi < 18.5:
        calorie_target = 2200
        weight_note = "UNDERWEIGHT (BMI {:.1f}). Prioritize calorie-dense, nutrient-rich foods.".format(bmi)
    elif bmi > 25:
        calorie_target = 1600
        weight_note = "OVERWEIGHT (BMI {:.1f}). Focus on low-calorie, high-fiber foods.".format(bmi)
    else:
        calorie_target = 1800
        weight_note = f"NORMAL weight (BMI {bmi:.1f})."

    # Build product-specific profile context
    product_type = patient.get("product_type", "GutHeal")
    symptoms = patient.get("symptoms", {})
    if product_type == "SEnS":
        product_context = (
            f"- Sleep: {symptoms.get('Disturbed Sleep', 'N/A')}\n"
            f"- Stress: {symptoms.get('Stress', 'N/A')}\n"
            f"- Anxiety/Energy: {symptoms.get('Anxiety', 'N/A')}"
        )
    else:
        product_context = (
            f"- IBS subtype: {patient['ibs_info'].get('subtype', 'N/A')} "
            f"({patient['ibs_info'].get('severity_level', 'N/A')})"
        )

    # Merge microbiome avoids (from food_list) with patient allergies/triggers, deduplicated
    merged_avoids = []
    seen_avoids = set()
    for a in list(patient.get('avoid_foods', [])) + list(patient.get('avoid_list', [])):
        if a and a.lower() not in seen_avoids:
            seen_avoids.add(a.lower())
            merged_avoids.append(a)
    avoid_foods_str = ', '.join(merged_avoids) or 'None'

    prompt = f"""You are a certified Indian clinical nutritionist AI. Generate a personalized 1-day Indian household meal plan.

Your role is composition only — arrange the approved foods into traditional Indian meals. Do not introduce any food not in the APPROVED list.

STRICT RULES:
1. NEVER use any food from the "NEVER USE THESE FOODS" list.
2. Use ONLY foods from the APPROVED FOODS list.
3. Every ingredient MUST include an exact quantity in grams (e.g., 100).
4. For accurate macros, output calories, protein_g, carbs_g, but know our backend calculates exact metrics from your ingredients.
5. Daily total must be close to the calorie target (±10%).
6. All meals must be traditional Indian household recipes.
7. Output ONLY valid JSON. No explanations.
8. The day has 5 meals: breakfast, mid_morning_snack, lunch, evening_snack, dinner.
9. Prefer easy-to-digest meals; avoid gas-producing foods where possible.
10. ACCOMPANIMENTS RULE: If a dry carbohydrate is generated (e.g., Dosa, Roti, Chapati, Idli, Paratha), you MUST pair it with a wet accompaniment (e.g., Dal, Sambar, Sabzi, Chutney). Combine them in the ingredient list and include them in the 'accompaniments' list!

PATIENT PROFILE:
- Product: {product_type}
- Diet: {patient['diet_type']}
- Location: {patient.get('location', 'India')}
- Weight status: {weight_note}
{product_context}
- Daily calorie target: {calorie_target} kcal

APPROVED FOODS (use ONLY these):
{food_context}

NEVER USE THESE FOODS (includes microbiome avoids + patient allergies):
{avoid_foods_str}

BACTERIA GOALS:
{increase_context or 'None specified'}
{decrease_context or 'None specified'}

OUTPUT JSON SCHEMA:
{{
  "calorie_target": {calorie_target},
  "day_1": {{
    "breakfast": {{"name": "...", "serving_size": "e.g., 2 dosas", "accompaniments": ["..."], "ingredients": [{{"name": "...", "quantity_g": 100}}], "total_calories": 400, "protein_g": 12, "carbs_g": 50, "fat_g": 10, "fiber_g": 5, "prep_time_min": 15, "benefits": "..."}},
    "mid_morning_snack": {{...}},
    "lunch": {{...}},
    "evening_snack": {{...}},
    "dinner": {{...}}
  }}
}}

Generate the complete 1-day meal plan now. Output ONLY valid JSON."""

    try:
        response = bedrock.converse(
            modelId=LLM_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 3000, "temperature": 0.3, "topP": 0.9}
        )
        content = response["output"]["message"]["content"][0]["text"]

        # Extract JSON from response
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            meal_plan = json.loads(content[json_start:json_end])
            return meal_plan

        logger.error(f"No valid JSON found in LLM response: {content[:200]}")
        return _generate_fallback_plan(patient, relevant_foods, calorie_target)

    except Exception as e:
        logger.error(f"Bedrock invocation failed: {e}", exc_info=True)
        return _generate_fallback_plan(patient, relevant_foods, calorie_target)


def _generate_fallback_plan(patient: dict, foods: list, calorie_target: int) -> dict:
    """Generate a simple fallback meal plan if Bedrock fails."""
    plan = {"calorie_target": calorie_target, "note": "Fallback plan — AI was unavailable"}
    safe_foods = [f for f in foods if f["category"] in ["Cereals", "Pulses", "Vegetables", "Fruits", "Dairy"]][:10]

    day_key = "day_1"
    plan[day_key] = {}
    for meal_type in ["breakfast", "mid_morning_snack", "lunch", "evening_snack", "dinner"]:
        food = safe_foods[0] if safe_foods else {"name_en": "Rice", "per_100g": {"calories": 345, "protein_g": 7, "carbs_g": 78, "fat_g": 0.5, "fiber_g": 0.2}}
        plan[day_key][meal_type] = {
            "name": f"{food['name_en']} {meal_type.replace('_', ' ')}",
            "serving_size": "1 serving",
            "accompaniments": [],
            "ingredients": [{"name": food["name_en"], "quantity_g": 100}],
            "total_calories": food["per_100g"]["calories"],
            "protein_g": food["per_100g"]["protein_g"],
            "carbs_g": food["per_100g"]["carbs_g"],
            "fat_g": food["per_100g"]["fat_g"],
            "fiber_g": food["per_100g"]["fiber_g"],
        }
    return plan


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

            meal_calc = {"cal": 0, "pro": 0, "carb": 0, "fat": 0, "fib": 0}

            # Enrich ingredients with nutrition data
            for ing in meal.get("ingredients", []):
                food_id = ing.get("food_id", "")
                food_name = ing.get("name", "").lower()

                nutrition_info = food_lookup.get(food_id)
                if not nutrition_info:
                    nutrition_info = name_lookup.get(food_name)

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
                    
                    meal_calc["cal"] += ing_cal
                    meal_calc["pro"] += ing_pro
                    meal_calc["carb"] += ing_carb
                    meal_calc["fat"] += ing_fat
                    meal_calc["fib"] += ing_fib

                    if nutrition_info.get("micronutrients"):
                        ing["micronutrients"] = {
                            k: round(v * multiplier, 2)
                            for k, v in nutrition_info["micronutrients"].items()
                        }
            
            # OVERRIDE LLM HALLUCINATED MACROS WITH STRICT EXACT MATH
            if meal_calc["cal"] > 0:
                meal["total_calories"] = int(meal_calc["cal"])
                meal["protein_g"] = int(meal_calc["pro"])
                meal["carbs_g"] = int(meal_calc["carb"])
                meal["fat_g"] = int(meal_calc["fat"])
                meal["fiber_g"] = round(meal_calc["fib"], 1)

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
        
        # We need to convert floats to Decimals for DynamoDB
        item_data = {
            "kit_id": kit_id,
            "created_at": timestamp,
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
