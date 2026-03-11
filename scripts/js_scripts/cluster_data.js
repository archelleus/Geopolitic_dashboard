const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('../../data/oil_fields.json', 'utf8'));

const CELL_SIZE = 5;

const grid = {};
rawData.forEach(field => {
    const cellX = Math.floor(field.lng / CELL_SIZE);
    const cellY = Math.floor(field.lat / CELL_SIZE);
    const key = `${cellX}_${cellY}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(field);
});

const clusteredOutput = [];

// Find global max for scaling (combine oil + gas in boe equivalent)
let globalMaxEnergy = 0;

Object.values(grid).forEach(fields => {
    let totalOil = 0, totalGas = 0;
    fields.forEach(f => {
        totalOil += f.reserves_oil_mmbbl || 0;
        totalGas += f.reserves_gas_mm3 || 0;
    });
    // Convert gas to barrel of oil equivalent: 1 m³ gas ≈ 0.00629 bbl
    const totalEnergy = totalOil + (totalGas * 0.00629);
    if (totalEnergy > globalMaxEnergy) globalMaxEnergy = totalEnergy;
});

Object.values(grid).forEach(fields => {
    let sumLat = 0, sumLng = 0;
    let totalOil = 0, totalGas = 0;
    fields.forEach(f => {
        sumLat += f.lat;
        sumLng += f.lng;
        totalOil += f.reserves_oil_mmbbl || 0;
        totalGas += f.reserves_gas_mm3 || 0;
    });
    const centroidLat = sumLat / fields.length;
    const centroidLng = sumLng / fields.length;
    const count = fields.length;

    // Determine dominant fuel type
    const gasBoe = totalGas * 0.00629;
    let fuelType = 'unknown';
    if (totalOil > 0 && gasBoe > 0) {
        const ratio = totalOil / (totalOil + gasBoe);
        if (ratio > 0.7) fuelType = 'oil';
        else if (ratio < 0.3) fuelType = 'gas';
        else fuelType = 'mixed';
    } else if (totalOil > 0) {
        fuelType = 'oil';
    } else if (gasBoe > 0) {
        fuelType = 'gas';
    }

    // Country breakdown with reserves
    const countryReserves = {};
    fields.forEach(f => {
        if (!countryReserves[f.country]) {
            countryReserves[f.country] = { oil: 0, gas: 0, count: 0 };
        }
        countryReserves[f.country].oil += f.reserves_oil_mmbbl || 0;
        countryReserves[f.country].gas += f.reserves_gas_mm3 || 0;
        countryReserves[f.country].count++;
    });
    const countriesSorted = Object.entries(countryReserves)
        .sort((a, b) => (b[1].oil + b[1].gas * 0.00629) - (a[1].oil + a[1].gas * 0.00629))
        .map(([name, data]) => ({
            name,
            oil: data.oil,
            gas: data.gas,
            count: data.count
        }));

    const primaryCountry = countriesSorted[0].name;

    // Radius scales with total energy (log scale)
    const totalEnergy = totalOil + gasBoe;
    const energyLog = totalEnergy > 0 ? Math.log10(totalEnergy + 1) : 0;
    const maxLog = Math.log10(globalMaxEnergy + 1);
    const radiusMeters = Math.max(20000, (energyLog / maxLog) * 250000);

    // Format reserves nicely
    const formatOil = (v) => {
        if (v >= 1000) return (v / 1000).toFixed(1) + ' billion bbl';
        if (v > 0) return v.toFixed(1) + ' million bbl';
        return 'No data';
    };
    const formatGas = (v) => {
        if (v >= 1000000) return (v / 1000000).toFixed(1) + ' trillion m³';
        if (v >= 1000) return (v / 1000).toFixed(1) + ' billion m³';
        if (v > 0) return v.toFixed(1) + ' million m³';
        return 'No data';
    };

    clusteredOutput.push({
        name: count === 1 ? fields[0].name : `${count} extraction sites`,
        primaryCountry,
        fuelType,
        countries: countriesSorted.slice(0, 5).map(c =>
            `${c.name}: ${formatOil(c.oil)} (${c.count} fields)`
        ),
        totalOil,
        totalGas,
        totalOilFormatted: formatOil(totalOil),
        totalGasFormatted: formatGas(totalGas),
        count,
        lat: centroidLat,
        lng: centroidLng,
        radius: radiusMeters
    });
});

// Sort by total energy for reference
clusteredOutput.sort((a, b) => (b.totalOil + b.totalGas * 0.00629) - (a.totalOil + a.totalGas * 0.00629));

fs.writeFileSync('../../data/oil_fields_clustered.json', JSON.stringify(clusteredOutput));
console.log(`Clustered ${rawData.length} fields into ${clusteredOutput.length} clusters.`);
const oilCount = clusteredOutput.filter(c => c.fuelType === 'oil').length;
const gasCount = clusteredOutput.filter(c => c.fuelType === 'gas').length;
const mixedCount = clusteredOutput.filter(c => c.fuelType === 'mixed').length;
const unknownCount = clusteredOutput.filter(c => c.fuelType === 'unknown').length;
console.log(`Oil-dominant: ${oilCount}, Gas-dominant: ${gasCount}, Mixed: ${mixedCount}, No data: ${unknownCount}`);
