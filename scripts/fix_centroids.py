import json

def get_area(poly):
    # poly is a list of [lng, lat]
    area = 0
    for i in range(len(poly)-1):
        area += poly[i][0] * poly[i+1][1] - poly[i+1][0] * poly[i][1]
    return abs(area) / 2.0

def get_bbc(poly):
    minx = min(p[0] for p in poly)
    maxx = max(p[0] for p in poly)
    miny = min(p[1] for p in poly)
    maxy = max(p[1] for p in poly)
    return (minx + maxx) / 2.0, (miny + maxy) / 2.0

with open('ne_110m_admin_0_countries.geojson', 'r') as f:
    data = json.load(f)

centroids = {}
for feature in data.get('features', []):
    props = feature.get('properties', {})
    iso = props.get('ISO_A3')
    if not iso or iso == '-99':
        iso = props.get('ADM0_A3')
        
    geom = feature.get('geometry')
    if not geom: continue
    
    typ = geom.get('type')
    coords = geom.get('coordinates', [])
    
    biggest_poly = None
    max_area = -1
    
    if typ == 'Polygon':
        biggest_poly = coords[0]
    elif typ == 'MultiPolygon':
        for poly_wrap in coords:
            poly = poly_wrap[0]
            area = get_area(poly)
            if area > max_area:
                max_area = area
                biggest_poly = poly
    
    if biggest_poly:
        lng, lat = get_bbc(biggest_poly)
        centroids[iso] = {'lat': lat, 'lng': lng}

with open('automated_political_data.json', 'r') as f:
    pdata = json.load(f)

for iso, coords in centroids.items():
    if iso in pdata:
        pdata[iso]['location'] = coords

# Ensure problematic multi-territory / anti-meridian countries are manually overridden for perfect centering
special_fixes = {
    'USA': {'lat': 39.8283, 'lng': -98.5795}, # Center of Contiguous USA
    'RUS': {'lat': 61.5240, 'lng': 95.3188},  # Visually pleasing center of Russia block
    'FRA': {'lat': 46.2276, 'lng': 2.2137},   # Center of European France
    'GBR': {'lat': 54.3781, 'lng': -3.4360},  # UK Center
    'NZL': {'lat': -40.9006, 'lng': 174.8860},
    'FJI': {'lat': -17.7134, 'lng': 178.0650},
    'CAN': {'lat': 56.1304, 'lng': -106.3468}, # Canada adjusted down slightly
    'AUS': {'lat': -25.2744, 'lng': 133.7751}, # Australia
    'ZAF': {'lat': -29.0, 'lng': 24.0},        # South Africa
    'CHN': {'lat': 35.8617, 'lng': 104.1954},  # China
    'IND': {'lat': 20.5937, 'lng': 78.9629},   # India
}
for iso, fix in special_fixes.items():
    if iso in pdata: pdata[iso]['location'] = fix

with open('automated_political_data.json', 'w') as f:
    json.dump(pdata, f, indent=2)

print("Centroids fixed intelligently!")
