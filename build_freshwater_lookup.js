const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('freshwater_data.json', 'utf8'));

// Build a lookup dictionary keyed by ISO3 code
// This makes it easy to match against GeoJSON country properties (ISO_A3)
const lookup = {};

rawData.forEach(entry => {
    lookup[entry.iso3] = {
        country: entry.country,
        iso3: entry.iso3,
        totalFreshwater_billionM3: entry.totalFreshwater_billionM3,
        perCapita_m3: entry.perCapita_m3 !== null ? Math.round(entry.perCapita_m3) : null,
        stressLevel: entry.stressLevel,
        stressLabel: {
            'absolute_scarcity': 'Absolute Scarcity',
            'chronic_shortage': 'Chronic Shortage',
            'water_stress': 'Water Stress',
            'sufficient': 'Sufficient',
            'no_data': 'No Data'
        }[entry.stressLevel],
        // Formatted values for display
        totalFormatted: entry.totalFreshwater_billionM3 >= 1000
            ? (entry.totalFreshwater_billionM3 / 1000).toFixed(1) + ' trillion m³'
            : entry.totalFreshwater_billionM3.toFixed(1) + ' billion m³',
        perCapitaFormatted: entry.perCapita_m3 !== null
            ? Math.round(entry.perCapita_m3).toLocaleString() + ' m³/person'
            : 'No data',
    };
});

fs.writeFileSync('freshwater_lookup.json', JSON.stringify(lookup));
console.log(`Built freshwater lookup for ${Object.keys(lookup).length} countries.`);

// Quick verification
const stressCounts = { absolute_scarcity: 0, chronic_shortage: 0, water_stress: 0, sufficient: 0, no_data: 0 };
Object.values(lookup).forEach(c => stressCounts[c.stressLevel]++);
console.log('Stress distribution:', stressCounts);
console.log('\nSample entries:');
['USA', 'IND', 'BRA', 'SAU', 'EGY', 'ISL'].forEach(iso => {
    const c = lookup[iso];
    if (c) console.log(`  ${c.country}: ${c.totalFormatted} total, ${c.perCapitaFormatted} per capita [${c.stressLabel}]`);
});
