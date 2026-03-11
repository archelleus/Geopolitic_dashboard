import json

file_path = '../data/automated_political_data.json'
with open(file_path, 'r') as f:
    data = json.load(f)

# Patch USA
if 'USA' in data:
    data['USA']['leader'] = 'Donald Trump'
    data['USA']['leader_party'] = 'Republican Party'
    data['USA']['leader_ideology'] = 'Conservatism, Right-wing populism, Nationalism'
    data['USA']['main_opposition'] = 'Democratic Party'
    data['USA']['opposition_ideology'] = 'Modern liberalism, Progressivism'

# Save
with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)

print("Intelligently patched outdated leadership profiles.")
