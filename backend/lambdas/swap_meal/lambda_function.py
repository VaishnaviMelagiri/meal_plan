"""
Lambda: swap_meal
Generates a replacement meal when user rejects one.
Uses RAG to find a nutritionally similar alternative.

API: POST /swap
Body: {"kit_id": "IOM_KIT001", "day": "day_1", "meal_type": "breakfast", "current_meal": "Ragi Dosa", "reason": "optional"}
"""

import json
import os
import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime")

DATA_BUCKET = os.environ.get("DATA_BUCKET", "nutrigenie-data")
LLM_MODEL_ID = os.environ.get("LLM_MODEL_ID", "amazon.nova-micro-v1:0")
RECIPES_TABLE = os.environ.get("RECIPES_TABLE", "NutriGenieCustomRecipes")


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else event.get("body", {})
        kit_id = body.get("kit_id", "").strip()
        day = body.get("day", "")
        meal_type = body.get("meal_type", "")
        current_meal = body.get("current_meal", "")
        reason = body.get("reason", "")

        if not kit_id or not day or not meal_type:
            return _response(400, {"error": "kit_id, day, and meal_type are required"})

        logger.info(f"Swap meal for {kit_id}: {day}/{meal_type} (current: {current_meal})")

        # Load patient data
        patient = _load_patient(kit_id)
        if not patient:
            return _response(404, {"error": f"No patient data for {kit_id}"})

        # Load nutrition data for context
        nutrition_data = _load_nutrition_data()

        # Optional calorie hint for the rejected meal (matches its target if provided)
        current_calories = body.get("current_calories", "")

        # Approved foods come from the patient's food_list (yes_foods)
        yes_foods = patient.get("yes_foods", [])
        if yes_foods:
            approved_context = "\n".join(f"- {f}" for f in yes_foods)
        else:
            # Fallback for older JSON without a food_list: offer the IFCT dataset
            approved_context = "\n".join([
                f"- {f['name_en']} ({f['category']}): {f['per_100g']['calories']} kcal, "
                f"protein {f['per_100g']['protein_g']}g, carbs {f['per_100g']['carbs_g']}g, "
                f"fat {f['per_100g']['fat_g']}g, fiber {f['per_100g']['fiber_g']}g per 100g"
                for f in nutrition_data[:20]
                if f['name_en'].lower() not in current_meal.lower()
            ])

        # NEVER USE = food_list avoids + patient allergies/triggers, deduplicated
        never_use = []
        seen_never = set()
        for a in list(patient.get("avoid_foods", [])) + _get_avoid_list(patient):
            if a and a.lower() not in seen_never:
                seen_never.add(a.lower())
                never_use.append(a)

        # Generate replacement via Bedrock
        system_prompt = """You are a certified Indian clinical nutritionist AI. Generate exactly ONE replacement meal.
RULES:
1. NEVER use foods from the NEVER USE list.
2. Use ONLY foods from the APPROVED FOODS list.
3. Keep similar calorie count (±15%) and nutritional profile to the rejected meal.
4. Must be a traditional Indian household recipe.
5. ACCOMPANIMENTS RULE: If a dry carbohydrate is generated (e.g., Dosa, Roti, Chapati, Idli, Paratha), you MUST pair it with a wet accompaniment (e.g., Dal, Sambar, Sabzi, Chutney). Combine them in the ingredient list and include them in the 'accompaniments' list.
6. Output ONLY valid JSON. No explanations."""

        meal_labels = {
            "breakfast": "breakfast (7-8 AM)",
            "mid_morning_snack": "mid-morning snack (10-11 AM)",
            "lunch": "lunch (12:30-1:30 PM)",
            "evening_snack": "evening snack (4-5 PM)",
            "dinner": "dinner (7-8 PM)"
        }

        calorie_note = f" (~{current_calories} kcal)" if current_calories else ""

        user_prompt = f"""PATIENT:
- Diet: {patient.get('diet_type', 'Veg')}
- IBS: {patient.get('ibs_subtype', 'IBS Diarrhoea')}

NEVER USE:
{', '.join(never_use) if never_use else 'None'}

REJECTED MEAL: {current_meal} (for {meal_labels.get(meal_type, meal_type)})
REJECTION REASON: {reason or 'User preference'}

APPROVED FOODS — use only these:
{approved_context}

Generate ONE replacement {meal_labels.get(meal_type, meal_type)} meal using only the APPROVED FOODS, matching approximately the same calorie target as the rejected meal{calorie_note}.

OUTPUT JSON:
{{
  "name": "...",
  "serving_size": "e.g., 2 parathas",
  "accompaniments": ["Curd", "Pickle"],
  "ingredients": [{{"name": "...", "quantity_g": 100}}],
  "total_calories": 400,
  "protein_g": 12,
  "carbs_g": 50,
  "fat_g": 10,
  "fiber_g": 5,
  "prep_time_min": 15,
  "benefits": "Why this is good for the patient"
}}"""

        prompt = system_prompt + "\n\n" + user_prompt

        response = bedrock.converse(
            modelId=LLM_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1000, "temperature": 0.4, "topP": 0.9}
        )
        content = response["output"]["message"]["content"][0]["text"]

        # Parse JSON
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            new_meal = json.loads(content[json_start:json_end])
            
            # OVERRIDE LLM HALLUCINATED MACROS WITH STRICT EXACT MATH
            meal_calc = {"cal": 0, "pro": 0, "carb": 0, "fat": 0, "fib": 0}
            food_lookup = {f["food_id"]: f for f in nutrition_data}
            name_lookup = {f["name_en"].lower(): f for f in nutrition_data}
            
            for ing in new_meal.get("ingredients", []):
                food_id = ing.get("food_id", "")
                food_name = ing.get("name", "").lower()
                
                nutrition_info = food_lookup.get(food_id) or name_lookup.get(food_name)
                
                if nutrition_info:
                    qty = ing.get("quantity_g", 100)
                    multiplier = float(qty) / 100.0
                    ing_cal = round(nutrition_info["per_100g"]["calories"] * multiplier, 1)
                    ing_pro = round(nutrition_info["per_100g"]["protein_g"] * multiplier, 1)
                    ing_carb = round(nutrition_info["per_100g"]["carbs_g"] * multiplier, 1)
                    ing_fat = round(nutrition_info["per_100g"]["fat_g"] * multiplier, 1)
                    ing_fib = round(nutrition_info["per_100g"]["fiber_g"] * multiplier, 1)
                    
                    ing["nutrition_per_serving"] = {
                        "calories": ing_cal, "protein_g": ing_pro, "carbs_g": ing_carb,
                        "fat_g": ing_fat, "fiber_g": ing_fib
                    }
                    
                    meal_calc["cal"] += ing_cal
                    meal_calc["pro"] += ing_pro
                    meal_calc["carb"] += ing_carb
                    meal_calc["fat"] += ing_fat
                    meal_calc["fib"] += ing_fib

            if meal_calc["cal"] > 0:
                new_meal["total_calories"] = int(meal_calc["cal"])
                new_meal["protein_g"] = int(meal_calc["pro"])
                new_meal["carbs_g"] = int(meal_calc["carb"])
                new_meal["fat_g"] = int(meal_calc["fat"])
                new_meal["fiber_g"] = round(meal_calc["fib"], 1)
                
        else:
            return _response(500, {"error": "AI failed to generate valid replacement"})
            
        _save_recipe_to_db(new_meal)

        return _response(200, {
            "day": day,
            "meal_type": meal_type,
            "replaced": current_meal,
            "new_meal": new_meal,
        })

    except Exception as e:
        logger.error(f"Swap error: {e}", exc_info=True)
        return _response(500, {"error": str(e)})


def _load_patient(kit_id):
    try:
        obj = s3.get_object(Bucket=DATA_BUCKET, Key=f"patients/{kit_id}.json")
        data = json.loads(obj["Body"].read().decode("utf-8"))
        meta = data.get("metadata", {})

        # Parse food_list the same way as generate_meal
        yes_foods = []
        avoid_foods = []
        food_list = data.get("food_list")
        if food_list:
            for item in food_list:
                food_item = item.get("Food Item", "")
                final_call = item.get("final_call", "")
                if final_call == "take":
                    yes_foods.append(food_item)
                elif final_call == "avoid":
                    avoid_foods.append(food_item)

        return {
            "diet_type": meta.get("Which best describes your usual diet", "Veg"),
            "ibs_subtype": meta.get("Do you know which subtype of IBS you have?", ""),
            "allergies": meta.get("Do you have food allergies or intolerances?",
                                  meta.get("Do you have any food allergies or intolerances?", "")),
            "yes_foods": yes_foods,
            "avoid_foods": avoid_foods,
        }
    except Exception:
        return None


def _get_avoid_list(patient):
    raw = patient.get("allergies", "")
    if raw and raw.lower() not in ["no", "none", ""]:
        return [i.strip() for i in raw.replace("(legumes)", "").split(",") if i.strip()]
    return []


def _load_nutrition_data():
    try:
        obj = s3.get_object(Bucket=DATA_BUCKET, Key="nutrition/indian_nutrition_dataset.json")
        return json.loads(obj["Body"].read().decode("utf-8"))
    except Exception:
        return []


def _save_recipe_to_db(meal: dict):
    """Save the newly generated swap meal to the custom recipes table."""
    try:
        import uuid
        from datetime import datetime, timezone
        from decimal import Decimal
        
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(RECIPES_TABLE)
        
        name = meal.get("name")
        if not name:
            return
            
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
            "benefits": meal.get("benefits", "AI Generated Swap Meal"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "MealSwapGenerator"
        }
        
        item_json = json.dumps(item_data)
        item_dict = json.loads(item_json, parse_float=Decimal)
        table.put_item(Item=item_dict)
    except Exception as e:
        logger.warning(f"Failed to save recipe to DB: {e}")


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
