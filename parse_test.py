import pandas as pd
import re

df = pd.read_csv('index.csv')
for index, row in df.head(10).iterrows():
    raw = str(row.get('Raw_Data', ''))
    # Extract numbers at the end
    # Match an optional string (name), then a sequence of numbers (some with ±)
    name_match = re.match(r'^(.*?)\s+([\d\.\±\s]+)$', raw)
    if name_match:
        name = name_match.group(1).strip()
        nums = name_match.group(2).split()
        print(f"Code: {row['Food_Code']}, Name: {name}, Nums: {nums}")
    else:
        print(f"Code: {row['Food_Code']} - No match: {raw}")

