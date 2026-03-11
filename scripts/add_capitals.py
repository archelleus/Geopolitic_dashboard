import json

with open('automated_political_data.json', 'r') as f:
    pdata = json.load(f)

try:
    with open('capitals.json', 'r') as f:
        cdata = json.load(f)
except FileNotFoundError:
    print('No capitals.json')
    exit(1)

# map cca3 to capital & coords
capi_map = {}
for entry in cdata:
    iso = entry.get('cca3')
    caps = entry.get('capital', [])
    info = entry.get('capitalInfo', {})
    latlng = info.get('latlng', [])
    if iso and caps and len(latlng) == 2:
        capi_map[iso] = {
            'name': caps[0],
            'lat': latlng[0],
            'lng': latlng[1]
        }

count = 0
for iso in pdata:
    if iso in capi_map:
        pdata[iso]['capital'] = capi_map[iso]['name']
        pdata[iso]['capital_location'] = {'lat': capi_map[iso]['lat'], 'lng': capi_map[iso]['lng']}
        count += 1
    else:
        # Fallbacks for any missing standard ISOs
        pass

with open('automated_political_data.json', 'w') as f:
    json.dump(pdata, f, indent=2)

print(f"Added precise capital locations for {count} countries.")
