import json

# Load files
try:
    with open('automated_political_data.json', 'r') as f:
        pdata = json.load(f)
except Exception as e:
    print(f"Error loading automated_political_data.json: {e}")
    exit(1)

try:
    with open('country_resources.json', 'r') as f:
        resources = json.load(f)
except Exception as e:
    print(f"Error loading country_resources.json: {e}")
    exit(1)

# Update automated_political_data.json
for iso, data in pdata.items():
    res = resources.get(iso, {})
    e_res = {
        'total_oil_mmbbl': res.get('oil_mmbbl', 0),
        'total_gas_mm3': res.get('gas_mm3', 0),
        'total_ree_treo_mt': res.get('treo_mt', 0),
        'known_elements': res.get('elements', [])
    }
    data['economic_resources'] = e_res

# Save
with open('automated_political_data.json', 'w') as f:
    json.dump(pdata, f, indent=2)

print("Successfully updated automated_political_data.json with resource totals.")
