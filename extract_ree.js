const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('Global_REE_occurrence_database.xlsx');
const mainSheet = wb.Sheets['Sheet1'];
const mainData = xlsx.utils.sheet_to_json(mainSheet);

const fieldMap = {};
mainData.forEach(r => {
    if (r.Latitude && r.Longitude) {
        const lat = parseFloat(r.Latitude);
        const lng = parseFloat(r.Longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            const treo = parseFloat(r.RR_TREO_Mt) || 0;
            const ore = parseFloat(r.RR_Ore_Mt) || 0;

            // Generate a unique ID if ID_No is missing, but it should exist.
            const fieldId = r['ID_No'] || `gen_${Math.random()}`;

            fieldMap[fieldId] = {
                id: fieldId,
                name: r['Name'] || 'Unknown site',
                commods: r['Commods'] || 'Unknown',
                dep_type: r['Dep_Type'] || 'Unknown',
                status: r['Status'] || 'Unknown',
                country: r['Country'] || 'Unknown',
                lat, lng,
                treo_mt: treo,
                ore_mt: ore
            };
        }
    }
});

const allFields = Object.values(fieldMap);
console.log(`Total extracted REE locations: ${allFields.length}`);

// Filter to only significant deposits:
// - Status includes "Deposit" (confirmed or probable)
// - OR has actual TREO reserve data
const significant = allFields.filter(f => {
    const isDeposit = f.status && f.status.toLowerCase().includes('deposit');
    const hasTreo = f.treo_mt > 0;
    return isDeposit || hasTreo;
});

fs.writeFileSync('ree_fields.json', JSON.stringify(significant, null, 2));
console.log(`Filtered to ${significant.length} significant deposits (from ${allFields.length} total).`);

const withTreo = significant.filter(f => f.treo_mt > 0).length;
console.log(`Of these, ${withTreo} have TREO reserve data.`);
