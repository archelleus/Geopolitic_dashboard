const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('Global-Oil-and-Gas-Extraction-Tracker-March-2026.xlsx');

// 1. Load field locations
const mainSheet = wb.Sheets['Field-level main data'];
const mainData = xlsx.utils.sheet_to_json(mainSheet);

const fieldMap = {}; // Unit ID -> field info
mainData.forEach(r => {
    if (r.Latitude && r.Longitude) {
        const lat = parseFloat(r.Latitude);
        const lng = parseFloat(r.Longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            fieldMap[r['Unit ID']] = {
                id: r['Unit ID'],
                name: r['Unit Name'],
                fuel: r['Fuel type'],
                country: r['Country/Area'],
                status: r['Status'],
                onshore: r['Onshore/Offshore'],
                lat, lng,
                reserves_oil_mmbbl: 0,
                reserves_gas_mm3: 0,
                reserves_boe_mmboe: 0
            };
        }
    }
});

// 2. Load reserves data and merge
const resSheet = wb.Sheets['Field-level reserves data'];
const resData = xlsx.utils.sheet_to_json(resSheet);

resData.forEach(r => {
    const id = r['Unit ID'];
    const qty = parseFloat(r['Quantity (converted)']) || 0;
    const units = r['Units (converted)'];

    if (fieldMap[id] && qty > 0) {
        if (units === 'million bbl') {
            fieldMap[id].reserves_oil_mmbbl += qty;
        } else if (units === 'million m³') {
            fieldMap[id].reserves_gas_mm3 += qty;
        } else if (units === 'million boe') {
            fieldMap[id].reserves_boe_mmboe += qty;
        }
    }
});

const allFields = Object.values(fieldMap);
fs.writeFileSync('oil_fields.json', JSON.stringify(allFields));
console.log(`Extracted ${allFields.length} fields with reserves data.`);

// Stats
const withOil = allFields.filter(f => f.reserves_oil_mmbbl > 0).length;
const withGas = allFields.filter(f => f.reserves_gas_mm3 > 0).length;
console.log(`Fields with oil reserves: ${withOil}`);
console.log(`Fields with gas reserves: ${withGas}`);
