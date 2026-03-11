import json

try:
    with open('../data/automated_political_data.json', 'r') as f:
        pdata = json.load(f)
except FileNotFoundError:
    print("automated_political_data.json not found")
    exit(1)

try:
    with open('../data/oil_fields.json', 'r') as f:
        oil_fields = json.load(f)
except FileNotFoundError:
    oil_fields = []

try:
    with open('../data/ree_fields.json', 'r') as f:
        ree_fields = json.load(f)
except FileNotFoundError:
    ree_fields = []

def find_iso_by_name(name):
    if not name: return None
    name_lower = name.lower()
    for iso, d in pdata.items():
        if d['country'].lower() == name_lower: return iso
    for iso, d in pdata.items():
        if name_lower in d['country'].lower() or d['country'].lower() in name_lower: return iso
    
    mmap = {
        'usa': 'USA', 'united states': 'USA', 'uk': 'GBR', 'iran': 'IRN', 'russia': 'RUS', 'china': 'CHN', 
        'venezuela': 'VEN', 'saudi arabia': 'SAU', 'uae': 'ARE', 'united arab emirates': 'ARE',
        'canada': 'CAN', 'iraq': 'IRQ', 'kuwait': 'KWT', 'libya': 'LBY', 'nigeria': 'NGA', 'angola': 'AGO',
        'algeria': 'DZA', 'brazil': 'BRA', 'mexico': 'MEX', 'norway': 'NOR', 'ukraine': 'UKR', 'australia': 'AUS',
        'united kingdom': 'GBR', 'south korea': 'KOR', 'north korea': 'PRK', 'dem. rep. korea': 'PRK',
        'taiwan': 'TWN', 'syria': 'SYR', 'vietnam': 'VNM'
    }
    return mmap.get(name_lower, None)

country_resources = {}

for field in oil_fields:
    iso = find_iso_by_name(field.get('country'))
    if not iso: continue
    if iso not in country_resources:
        country_resources[iso] = {'oil_mmbbl': 0, 'gas_mm3': 0, 'treo_mt': 0, 'elements': set()}
    
    country_resources[iso]['oil_mmbbl'] += field.get('reserves_oil_mmbbl', 0)
    country_resources[iso]['gas_mm3'] += field.get('reserves_gas_mm3', 0)

element_map = {
    'U': 'Uranium', 'U(?)': 'Uranium',
    'Th': 'Thorium', 'Th Nb': 'Thorium',
    'REE': 'Rare Earths', 'REE(?)': 'Rare Earths',
    'Li': 'Lithium',
    'Co': 'Cobalt',
    'Ni': 'Nickel',
    'Cu': 'Copper',
    'Ta': 'Tantalum',
    'Nb': 'Niobium',
    'Au': 'Gold',
    'Ag': 'Silver',
    'Pt': 'Platinum', 'PGE': 'Platinum Group Elements',
    'Ti': 'Titanium',
    'V': 'Vanadium'
}

for field in ree_fields:
    iso = find_iso_by_name(field.get('country'))
    if not iso: continue
    if iso not in country_resources:
        country_resources[iso] = {'oil_mmbbl': 0, 'gas_mm3': 0, 'treo_mt': 0, 'elements': set()}
        
    country_resources[iso]['treo_mt'] += field.get('treo_mt', 0)
    
    commods = field.get('commods', '')
    if commods:
        for p in commods.replace(';', ',').split(','):
            val = p.strip()
            if val in element_map:
                country_resources[iso]['elements'].add(element_map[val])
            elif val and len(val) <= 2:
                country_resources[iso]['elements'].add(val)

# Finalize formatting for JSON serialization
for iso in country_resources:
    country_resources[iso]['elements'] = sorted(list(country_resources[iso]['elements']))

with open('../data/country_resources.json', 'w') as f:
    json.dump(country_resources, f, indent=2)

print("Created country_resources.json")
