"""
Local test script — runs full meal plan generation.
No AWS credentials needed.

Setup (OpenAI for testing):
  1. export OPENAI_API_KEY=sk-...
  2. Run this: python3 test_local.py

For mentor demo:
  - Shows real LLM-generated Indian meal plans
  - Uses patient's actual yes_foods from IOM report
  - Different output for KIT001 (Veg) vs SEnS (Pescatarian)
"""

import json, os, sys, unittest.mock as mock

# LLM routing — OpenAI for testing, Bedrock in production
os.environ['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY', '')
os.environ['GROQ_API_KEY'] = os.environ.get('GROQ_API_KEY', '')
os.environ['DATA_BUCKET'] = 'local-test'
os.environ['MEAL_PLANS_TABLE'] = 'local-test'
os.environ['RECIPES_TABLE'] = 'local-test'

# Mock AWS services — not needed for local test
boto3_mock = mock.MagicMock()
sys.modules['boto3'] = boto3_mock

# Import lambda
sys.path.insert(0, 'backend/lambdas/generate_meal')
import lambda_function as lf

# If no LLM key available, patch _call_bedrock to return a test response
if not os.environ.get('OPENAI_API_KEY') and not os.environ.get('ANTHROPIC_API_KEY') and not os.environ.get('GROQ_API_KEY'):
    def mock_call_bedrock(prompt):
        return '{"day_1": {"breakfast": {"name": "Test Meal", "ingredients": [], "total_calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "prep_time_min": 15, "benefits": "test"}, "mid_morning_snack": {"name": "Test Snack", "ingredients": [], "total_calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "prep_time_min": 10, "benefits": "test"}, "lunch": {"name": "Test Lunch", "ingredients": [], "total_calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "prep_time_min": 20, "benefits": "test"}, "evening_snack": {"name": "Test Evening", "ingredients": [], "total_calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "prep_time_min": 5, "benefits": "test"}, "dinner": {"name": "Test Dinner", "ingredients": [], "total_calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "prep_time_min": 20, "benefits": "test"}}}'
    lf._call_bedrock = mock_call_bedrock

def test_patient(kit_id, patient_file):
    print(f'\n{"="*60}')
    print(f'Testing: {kit_id}')
    print('='*60)

    # Load patient
    raw = json.load(open(patient_file))
    patient = lf._parse_iom_data(raw, kit_id)

    print(f'Patient: {patient["diet_type"]}, BMI {patient["bmi"]}, {patient["gender"]}, {patient["age"]}y')
    print(f'Product: {patient["product_type"]}')
    print(f'Yes foods ({len(patient["yes_foods"])}): {", ".join(patient["yes_foods"][:5])}...')
    print(f'Avoid foods: {len(patient["avoid_foods"])} items')
    print()

    # Calculate targets
    calorie_target, weight_note, macro_targets = lf._calculate_calorie_target(patient)
    print(f'Calorie target: {calorie_target} kcal')
    print(f'Macros: Protein {macro_targets["protein_g"]}g | Carbs {macro_targets["carbs_g"]}g | Fat {macro_targets["fat_g"]}g | Fiber {macro_targets["fiber_g"]}g')
    print()

    # Load nutrition data from local file (boto3 is mocked, so no S3)
    ifct_path = 'backend/data/indian_nutrition_dataset.json'
    import json as _json
    nutrition_data = []
    if os.path.exists(ifct_path):
        raw = _json.load(open(ifct_path))
        seen = set()
        for item in raw:
            if item['food_id'] not in seen and item.get('per_100g', {}).get('calories', 0) >= 50:
                seen.add(item['food_id'])
                nutrition_data.append(item)
        print(f'Loaded {len(nutrition_data)} clean IFCT items')

    # Get approved foods
    approved = lf._get_approved_foods(patient, nutrition_data)

    # Try LLM generation
    print('Calling OpenAI GPT-3.5-turbo...' if os.environ.get('OPENAI_API_KEY') else 'Calling AWS Bedrock...')
    try:
        plan = lf._generate_meal_plan(patient, approved)
        # Enrich with nutrition (uses the lambda's existing enrichment fn)
        plan = lf._enrich_with_nutrition(plan, nutrition_data)
        print('✅ LLM generation SUCCESS')
        print()

        day = plan.get('day_1', {})
        for slot in ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner']:
            meal = day.get(slot, {})
            if meal:
                ings = ', '.join([i['name'] for i in meal.get('ingredients', [])])
                print(f'  {slot}: {meal.get("name", "N/A")}')
                print(f'    Ingredients: {ings}')
                print(f'    Calories: {meal.get("total_calories", 0)} kcal | Protein: {meal.get("protein_g", 0)}g | Carbs: {meal.get("carbs_g", 0)}g | Fat: {meal.get("fat_g", 0)}g')
                print()

        print(f'Daily totals: {day.get("daily_totals", {})}')

    except Exception as e:
        print(f'❌ LLM failed: {e}')
        print('Showing fallback plan instead:')
        plan = lf._generate_fallback_plan(patient, approved, calorie_target)
        day = plan.get('day_1', {})
        for slot in ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner']:
            meal = day.get(slot, {})
            if meal:
                print(f'  {slot}: {meal.get("name", "N/A")}')

if __name__ == '__main__':
    print('NutriGenie — Local Test')
    print('Set OPENAI_API_KEY for real LLM output (else falls back to Bedrock)')
    print()

    patients = [
        ('IOM_KIT001', 'patients/IOM_KIT001.json'),
        ('IOM_KIT_SENS', 'patients/IOM_KIT_SENS.json'),
    ]

    for kit_id, path in patients:
        try:
            test_patient(kit_id, path)
        except Exception as e:
            print(f'Error testing {kit_id}: {e}')

    print('\n' + '='*60)
    print('Test complete.')
    print('For production: set OPENAI_API_KEY or AWS Bedrock credentials')
    print('='*60)
