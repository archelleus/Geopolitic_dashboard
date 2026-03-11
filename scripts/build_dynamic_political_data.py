import urllib.request
import urllib.parse
import urllib.error
import json
import time
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_world_bank_stability():
    print("Fetching Political Stability data from World Bank (WGI)...")
    url = "https://api.worldbank.org/v2/country/all/indicator/PV.EST?format=json&per_page=300&mrnev=1"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'GeopoliticsDashboard/1.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            
            stability_map = {}
            if len(data) > 1:
                for entry in data[1]:
                    iso3 = entry.get('countryiso3code')
                    val = entry.get('value')
                    if iso3 and val is not None:
                        stability_map[iso3] = round(float(val), 2)
            return stability_map
    except Exception as e:
        print(f"Error fetching World Bank data: {e}")
        return {}

def fetch_wikidata():
    print("Fetching Leader & Government Structure data from Wikidata...")
    # Using a SPARQL query to get all sovereign states, their ISO-3 codes, form of government, head of government, their party, and ideology
    query = """
    SELECT ?iso3 ?countryLabel ?govTypeLabel ?leaderLabel ?partyLabel ?ideologyLabel WHERE {
      ?country wdt:P31 wd:Q3624078;  # instance of sovereign state
               wdt:P298 ?iso3.       # ISO 3166-1 alpha-3 code
      
      OPTIONAL { ?country wdt:P122 ?govType. }
      OPTIONAL { 
        ?country wdt:P6 ?leader.     # head of government
        OPTIONAL { 
          ?leader wdt:P102 ?party.    # member of political party
          OPTIONAL { ?party wdt:P1142 ?ideology. } # political ideology
        }
      }
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    """
    
    url = "https://query.wikidata.org/sparql?query=" + urllib.parse.quote(query)
    
    headers = {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'GeopoliticsDashboardBot/1.0 (Contact: local-admin)'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            
            wiki_map = {}
            for row in data['results']['bindings']:
                iso3 = row.get('iso3', {}).get('value')
                if not iso3:
                    continue
                
                # Because Wikidata can return multiple rows for the same country (e.g., multiple parties or ideologies),
                # we need to group them.
                if iso3 not in wiki_map:
                    wiki_map[iso3] = {
                        "country": row.get('countryLabel', {}).get('value', ''),
                        "government_type": set(),
                        "leader": set(),
                        "leader_party": set(),
                        "leader_ideology": set()
                    }
                
                if 'govTypeLabel' in row:
                    wiki_map[iso3]["government_type"].add(row['govTypeLabel']['value'])
                if 'leaderLabel' in row:
                    wiki_map[iso3]["leader"].add(row['leaderLabel']['value'])
                if 'partyLabel' in row:
                    wiki_map[iso3]["leader_party"].add(row['partyLabel']['value'])
                if 'ideologyLabel' in row:
                    wiki_map[iso3]["leader_ideology"].add(row['ideologyLabel']['value'])
            
            # Convert sets to comma-separated strings
            for iso3 in wiki_map:
                wiki_map[iso3]["government_type"] = ", ".join(wiki_map[iso3]["government_type"]) or "Unknown"
                wiki_map[iso3]["leader"] = ", ".join(wiki_map[iso3]["leader"]) or "Unknown"
                wiki_map[iso3]["leader_party"] = ", ".join(wiki_map[iso3]["leader_party"]) or "Unknown"
                wiki_map[iso3]["leader_ideology"] = ", ".join(wiki_map[iso3]["leader_ideology"]) or "Unknown"
                
            return wiki_map
    except Exception as e:
        print(f"Error fetching Wikidata: {e}")
        return {}

def main():
    print("Building comprehensive political dataset...")
    
    stability_data = fetch_world_bank_stability()
    wiki_data = fetch_wikidata()
    
    # Merge datasets
    combined_database = {}
    
    all_isos = set(list(stability_data.keys()) + list(wiki_data.keys()))
    
    # Filter out empty or non-standard ISO codes
    all_isos = {iso for iso in all_isos if len(iso) == 3 and iso.isalpha()}
    
    print(f"Formatting data for {len(all_isos)} countries...")
    
    for iso in sorted(all_isos):
        w_data = wiki_data.get(iso, {})
        
        country_name = w_data.get("country", "")
        # If Wikidata didn't have it, we might just use the ISO as a fallback
        if not country_name:
            continue 
            
        combined_database[iso] = {
            "iso3": iso,
            "country": country_name,
            "government_type": w_data.get("government_type", "Unknown"),
            "leader": w_data.get("leader", "Unknown"),
            "leader_party": w_data.get("leader_party", "Unknown"),
            "leader_ideology": w_data.get("leader_ideology", "Unknown"),
            
            "main_opposition": "Requires manual input or Manifesto Project dataset",
            "opposition_ideology": "Requires manual input or Manifesto Project dataset",
            
            "regime_type": "Requires Polity5 Dataset download",
            
            "political_stability": stability_data.get(iso, "No WGI Data"),
            
            "extremist_groups": ["Requires Global Terrorism Database (GTD) download"],
            "terror_incidents_last5y": "Requires GTD database"
        }
    
    output_path = "../data/automated_political_data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(combined_database, f, indent=2, ensure_ascii=False)
    
    print(f"\nSuccessfully generated dataset at {output_path}!")
    print("Note: Datasets from Polity5, GTD, and Manifesto Project require manual bulk downloads.")
    print("They cannot be automatically scraped via public APIs without registration/API keys.")

if __name__ == "__main__":
    main()
