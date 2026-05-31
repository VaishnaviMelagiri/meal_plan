import json
import pandas as pd
import pathlib

# This script is designed to take the official IFCT 2017 Dataset (once downloaded locally as a CSV)
# and convert it into the required JSON schema for the NutriGenie RAG backend.
# The online npm repository recently blocked public API scraping, so you need to provide the CSV.

def process_ifct_csv_to_json(csv_path="index.csv", output_path="indian_nutrition_dataset.json"):
    try:
        print(f"Loading IFCT dataset from {csv_path}...")
        df = pd.read_csv(csv_path)
        
        output_data = []
        import re
        
        for index, row in df.iterrows():
            raw = str(row.get('Raw_Data', ''))
            
            # Extract numbers at the end
            name_match = re.match(r'^(.*?)\s+([\d\.\±\s]+)$', raw)
            if not name_match:
                continue
                
            name_en = name_match.group(1).strip()
            if not name_en:
                name_en = "Unknown"
                
            nums = name_match.group(2).split()
            
            try:
                # Remove ± and parse as floats
                clean_nums = [float(n.split('±')[0]) if '±' in n else float(n) for n in nums]
                
                # Based on standard IFCT Proximate format:
                # 0: Samples, 1: Moisture, 2: Protein, 3: Fat, 4: Ash, 5: Crude Fiber, 
                # 6: Insoluble DF, 7: Soluble DF, 8: Carbohydrate, 9: Energy(kJ)
                if len(clean_nums) >= 10:
                    calories_kcal = clean_nums[9] / 4.184
                    
                    item = {
                        "food_id": str(row.get("Food_Code", f"IFCT-{str(index).zfill(3)}")),
                        "category": "General",
                        "name_en": name_en,
                        "name_hi": "",
                        "name_regional": {},
                        "per_100g": {
                            "calories": round(calories_kcal, 2),
                            "protein_g": round(clean_nums[2], 2),
                            "carbs_g": round(clean_nums[8], 2),
                            "fat_g": round(clean_nums[3], 2),
                            "fiber_g": round(clean_nums[5], 2)
                        },
                        "micronutrients": {
                            "iron_mg": 0.0,
                            "calcium_mg": 0.0,
                            "zinc_mg": 0.0,
                        },
                        "common_dishes": [name_en],
                        "allergen_tags": [],
                        "season": "year-round"
                    }
                    output_data.append(item)
            except ValueError:
                continue
            
        print(f"Successfully mapped {len(output_data)} ingredients.")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=4, ensure_ascii=False)
            
        print(f"Dataset successfully exported to {output_path}!")
        print(f"Please move this file to backend/data/indian_nutrition_dataset.json to hot-swap the backend math.")

    except Exception as e:
        print(f"Extraction failed: {e}")
        print("Please ensure you have placed the official IFCT index.csv in the same directory.")

if __name__ == "__main__":
    process_ifct_csv_to_json()
