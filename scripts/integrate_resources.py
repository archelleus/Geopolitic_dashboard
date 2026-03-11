import json

with open('automated_political_data.json', 'r') as f:
    pdata = json.load(f)

with open('oil_fields_clustered.json', 'r') as f:
    oil_gas_clusters = json.load(f)

with open('ree_fields_clustered.json', 'r') as f:
    ree_clusters = json.load(f)

# Helper to find ISO by country name
def find_iso_by_name(name):
    # exact
    for iso, d in pdata.items():
        if d['country'].lower() == name.lower(): return iso
    # partial 
    for iso, d in pdata.items():
        if name.lower() in d['country'].lower() or d['country'].lower() in name.lower(): return iso
    # Manual map
    mmap = {
        'usa': 'USA', 'united states': 'USA', 'uk': 'GBR', 'iran': 'IRN', 'russia': 'RUS', 'china': 'CHN', 
        'venezuela': 'VEN', 'saudi arabia': 'SAU', 'uae': 'ARE', 'united arab emirates': 'ARE',
        'canada': 'CAN', 'iraq': 'IRQ', 'kuwait': 'KWT', 'libya': 'LBY', 'nigeria': 'NGA', 'angola': 'AGO',
        'algeria': 'DZA', 'brazil': 'BRA', 'mexico': 'MEX', 'norway': 'NOR', 'ukraine': 'UKR', 'australia': 'AUS'
    }
    return mmap.get(name.lower(), None)


# Initialize resources
for iso in pdata:
    pdata[iso]['economic_resources'] = {
        'oil_reserves': 'None recorded',
        'gas_reserves': 'None recorded',
        'ree_reserves': 'None recorded'
    }

# Process Oil/Gas
oil_map = {}
gas_map = {}
for cl in oil_gas_clusters:
    # "countries": ["Iran: 291.4 billion bbl (42 fields)"]
    for c_str in cl.get('countries', []):
        parts = c_str.split(':')
        if len(parts) >= 2:
            cname = parts[0].strip()
            detail = parts[1].strip()
            iso = find_iso_by_name(cname)
            if iso:
                if cl.get('totalOil', 0) > 0 and 'bbl' in detail:
                    if iso not in oil_map: oil_map[iso] = []
                    oil_map[iso].append(detail)
                if cl.get('totalGas', 0) > 0 and 'm³' in detail:
                    if iso not in gas_map: gas_map[iso] = []
                    gas_map[iso].append(detail)

for iso, records in oil_map.items():
    pdata[iso]['economic_resources']['oil_reserves'] = " | ".join(records)

for iso, records in gas_map.items():
    pdata[iso]['economic_resources']['gas_reserves'] = " | ".join(records)

# Process REE
ree_map = {}
for cl in ree_clusters:
    cname = cl.get('primaryCountry')
    if cname:
        iso = find_iso_by_name(cname)
        if iso:
            val = "%s tonnes (%s)" % (round(cl.get('totalTreo', 0), 2), cl.get('topCommodities', ''))
            if iso not in ree_map: ree_map[iso] = []
            ree_map[iso].append(val)

for iso, records in ree_map.items():
     # distinct records
     records = list(set(records))
     total_treo = sum(float(r.split(' tonnes')[0]) for r in records if 'tonnes' in r)
     if total_treo > 0:
         pdata[iso]['economic_resources']['ree_reserves'] = f"{total_treo} million tonnes (TREO)"
     else:
         # just list occurrences
         pdata[iso]['economic_resources']['ree_reserves'] = f"Active Occurrences & Deposits (No major TREO)"


with open('automated_political_data.json', 'w') as f:
    json.dump(pdata, f, indent=2)

print("Successfully integrated Oil, Gas, and REE data into automated_political_data.json")
