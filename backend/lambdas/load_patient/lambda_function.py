"""
Lambda: load_patient
Reads iom_data.json from S3, parses the patient profile for a given Kit ID.
Returns structured patient data including dietary constraints, bacterial info, and gut markers.

API: GET /patient/{kit_id}
"""

import json
import os
import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
DATA_BUCKET = os.environ.get("DATA_BUCKET", "nutrigenie-data")


def lambda_handler(event, context):
    try:
        kit_id = event.get("pathParameters", {}).get("kit_id", "").strip()
        if not kit_id:
            return _response(400, {"error": "kit_id is required"})

        logger.info(f"Loading patient data for kit_id: {kit_id}")

        # Read iom_data.json from S3
        try:
            obj = s3.get_object(
                Bucket=DATA_BUCKET,
                Key=f"patients/{kit_id}.json"
            )
            raw_data = json.loads(obj["Body"].read().decode("utf-8"))
        except s3.exceptions.NoSuchKey:
            return _response(404, {"error": f"No patient data found for kit_id: {kit_id}"})
        except Exception as e:
            logger.error(f"S3 read error: {e}")
            return _response(500, {"error": "Failed to read patient data"})

        # Parse into structured profile
        profile = _parse_iom_data(raw_data, kit_id)

        return _response(200, profile)

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return _response(500, {"error": str(e)})


def _get_field(metadata: dict, *keys):
    """Return the first non-empty value among the given metadata keys."""
    for key in keys:
        value = metadata.get(key)
        if value not in (None, ""):
            return value
    return ""


def _parse_iom_data(data: dict, kit_id: str) -> dict:
    """Parse iom_data.json into a clean patient profile."""
    metadata = data.get("metadata", {})
    tokens = data.get("tokens", {})

    # ── Product Type ──
    product_type = data.get("product_type", "GutHeal")

    # ── Basic Info ──
    profile = {
        "kit_id": kit_id,
        "name": _get_field(metadata, "Name", "Full Name") or "Unknown",
        "gender": metadata.get("Gender", ""),
        "age": metadata.get("Age", ""),
        "height_cm": metadata.get("Height", ""),
        "weight_kg": metadata.get("Weight", ""),
        "bmi": metadata.get("BMI", ""),
        "location": _get_field(metadata, "Location", "Location(City)"),
        "diet_type": _get_field(
            metadata,
            "Which best describes your usual diet",
            "Please describe your diet:",
            "Please describe your diet::",
        ) or "Veg",
        "product_type": product_type,
    }

    # ── IBS Info ──
    profile["ibs_info"] = {
        "subtype": metadata.get("Do you know which subtype of IBS you have?", ""),
        "severity_score": metadata.get("IBS Severity score", ""),
        "severity_level": metadata.get("IBS Severity Level", ""),
        "abdominal_pain": metadata.get("How severe is your abdominal pain?", ""),
        "bloating": metadata.get("How severe is your abdominal Distension/Bloating?", ""),
    }

    # ── Food Allergies / Avoid List ──
    allergies_raw = _get_field(
        metadata,
        "Do you have food allergies or intolerances?",
        "Do you have any food allergies or intolerances?",
        "Do you have any known allergies?",
    )
    if allergies_raw and allergies_raw.lower() not in ["no", "none", ""]:
        profile["avoid_list"] = [
            item.strip() for item in allergies_raw.replace("(legumes)", "").split(",")
            if item.strip()
        ]
    else:
        profile["avoid_list"] = []

    # ── Prebiotics / Gut Affectors ──
    profile["prebiotics"] = metadata.get("Prebiotics - Gut affectors", "")

    # ── Bacterial Data ──
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
            entry = {
                "name": b.get("Token_name", ""),
                "initial": b.get("Initial_Abundance", 0),
                "target": b.get("Optimised_abundance", 0),
                "description": b.get("Description", ""),
            }
            if b.get("Type") == "increase":
                bacteria_increase.append(entry)
            elif b.get("Type") == "decrease":
                bacteria_decrease.append(entry)
    except (json.JSONDecodeError, TypeError):
        pass

    profile["bacteria_to_increase"] = bacteria_increase
    profile["bacteria_to_decrease"] = bacteria_decrease

    # ── Pathogen Data ──
    try:
        pathogens = json.loads(tokens.get("#TIDP01", "[]"))
        profile["pathogens"] = [
            {"name": p["bacteria_name"], "abundance": p["abundance"], "range": p["range"]}
            for p in pathogens
        ]
    except (json.JSONDecodeError, TypeError):
        profile["pathogens"] = []

    # ── Gut Health Markers ──
    markers = []
    marker_keys = [
        ("#TID087", "#TID088", "#TID089", "#TID090"),  # Gut Diversity
        ("#TID091", "#TID092", "#TID093", "#TID094"),  # Insulin Resistance
        ("#TID095", "#TID096", "#TID097", "#TID098"),  # Probiotic Bacteria
        ("#TID099", "#TID100", "#TID101", "#TID102"),  # Lactic Acid
        ("#TID121", "#TID122", "#TID123", "#TID124"),  # Dietary Fibre
        ("#TID125", "#TID126", "#TID127", "#TID128"),  # Immunity
        ("#TID129", "#TID130", "#TID131", "#TID132"),  # Energy Producers
        ("#TID133", "#TID134", "#TID135", "#TID136"),  # Neg Weight
        ("#TID137", "#TID138", "#TID139", "#TID140"),  # Protein Metabolisers
        ("#TID141", "#TID142", "#TID143", "#TID144"),  # Carb Fermenters
        ("#TID145", "#TID146", "#TID147", "#TID148"),  # Heart Health
        ("#TID149", "#TID150", "#TID151", "#TID152"),  # F/B Ratio
    ]
    for name_key, status_key, level_key, desc_key in marker_keys:
        name = tokens.get(name_key, "")
        if name:
            markers.append({
                "name": name,
                "status": tokens.get(status_key, ""),
                "level": tokens.get(level_key, ""),
                "description": tokens.get(desc_key, ""),
            })
    profile["gut_markers"] = markers

    # ── Symptoms ──
    symptom_fields = [
        "Nausea", "Migraine", "Acid Reflux", "Flatulence/Bloating",
        "Heartburn", "Vomiting", "Stress", "Anxiety", "Depression", "Disturbed Sleep"
    ]
    profile["symptoms"] = {
        field: metadata.get(field, "Not Severe") for field in symptom_fields
    }

    # ── Food List (take / avoid) ──
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

    profile["yes_foods"] = yes_foods
    profile["avoid_foods"] = avoid_foods
    profile["yes_by_group"] = yes_by_group
    profile["avoid_by_group"] = avoid_by_group

    return profile


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        "body": json.dumps(body),
    }
