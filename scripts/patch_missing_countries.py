import json
import os

def patch_missing():
    with open('automated_political_data.json', 'r') as f:
        pdata = json.load(f)
        
    with open('ne_110m_admin_0_countries.geojson', 'r') as f:
        geo = json.load(f)

    added = 0
    for feat in geo['features']:
        props = feat['properties']
        iso = props.get('ISO_A3', '-99')
        if iso == '-99':
            iso = props.get('ADM0_A3', '-99')
            if iso == '-99':
                iso = props.get('GU_A3', '-99')
                
        if iso != '-99' and iso not in pdata:
            country_name = props.get('NAME_LONG') or props.get('NAME') or "Unknown"
            
            pdata[iso] = {
                "iso3": iso,
                "country": country_name,
                "government_type": "Data Unavailable",
                "leader": "Data Unavailable",
                "leader_party": "Data Unavailable",
                "leader_ideology": "Data Unavailable",
                "main_opposition": "Requires manual input or Manifesto Project dataset",
                "opposition_ideology": "Requires manual input or Manifesto Project dataset",
                "regime_type": "Requires Polity5 Dataset download",
                "political_stability": 0.0,
                "extremist_groups": ["Requires Global Terrorism Database (GTD) download"],
                "terror_incidents_last5y": "Requires GTD database"
            }
            added += 1
            print(f"Added missing country/territory: {country_name} ({iso})")
            
    with open('automated_political_data.json', 'w') as f:
        json.dump(pdata, f, indent=2)
        
    print(f"Patched {added} missing entities into database!")

if __name__ == "__main__":
    patch_missing()
