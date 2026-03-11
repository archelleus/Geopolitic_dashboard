import json

JSON_PATH = "./automated_political_data.json"

# A specific override dictionary for the most important global leaders.
# Sometimes Wikidata's "Head of Government" (P6) returns the Prime Minister
# when the Head of State or Supreme Leader holds the actual geopolitical power.
HARDCODED_LEADERS = {
    "CHN": {
        "leader": "Xi Jinping",
        "leader_party": "Chinese Communist Party",
        "leader_ideology": "Xi Jinping Thought, Socialism with Chinese characteristics, Communism, Nationalism",
        "government_type": "Unitary Marxist–Leninist One-Party Socialist Republic"
    },
    "USA": {
        "leader": "Joe Biden",
        "leader_party": "Democratic Party",
        "leader_ideology": "Center-left, Liberalism",
        "government_type": "Federal Presidential Constitutional Republic"
    },
    "GBR": {
        "leader": "Keir Starmer", # Updated to current PM
        "leader_party": "Labour Party",
        "leader_ideology": "Center-left, Social Democracy",
        "government_type": "Unitary Parliamentary Constitutional Monarchy"
    },
    "SAU": {
        "leader": "Mohammed bin Salman (Crown Prince & PM)",
        "leader_party": "None (Absolute Monarchy)",
        "leader_ideology": "Saudi Arabian Nationalism, Wahhabism, Absolute Monarchy",
        "government_type": "Unitary Absolute Monarchy"
    },
    "FRA": {
        "leader": "Emmanuel Macron",
        "leader_party": "Renaissance",
        "leader_ideology": "Centrism, Liberalism",
        "government_type": "Unitary Semi-Presidential Republic"
    },
    "IRN": {
        "leader": "Ali Khamenei (Supreme Leader)",
        "leader_party": "Combatant Clergy Association",
        "leader_ideology": "Khomeinism, Islamic Fundamentalism, Shia Islamism",
        "government_type": "Unitary Islamic Republic"
    },
    "RUS": {
        "leader": "Vladimir Putin",
        "leader_party": "United Russia (Supported by)",
        "leader_ideology": "Russian Nationalism, Conservatism, Statism",
        "government_type": "Federal Semi-Presidential Republic"
    },
    "IND": {
        "leader": "Narendra Modi",
        "leader_party": "Bharatiya Janata Party (BJP)",
        "leader_ideology": "Right-wing, Hindu Nationalism, Conservatism",
        "government_type": "Federal Parliamentary Constitutional Republic"
    },
    "PRK": {
        "leader": "Kim Jong Un",
        "leader_party": "Workers' Party of Korea",
        "leader_ideology": "Juche, Songun, Communism",
        "government_type": "Unitary Marxist-Leninist One-Party Socialist Republic"
    }
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        database = json.load(f)
        
    for iso, overrides in HARDCODED_LEADERS.items():
        if iso in database:
            # Update the specific fields
            for key, val in overrides.items():
                database[iso][key] = val
            print(f"Corrected leadership data for {iso}")
            
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(database, f, indent=2, ensure_ascii=False)
        
    print("Leader correction pass complete!")

if __name__ == "__main__":
    main()
