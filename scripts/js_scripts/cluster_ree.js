const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('../../data/ree_fields.json', 'utf8'));

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

// Determine global scaling parameters
let globalMaxTREO = 0;

Object.values(grid).forEach(fields => {
    let totalTREO = 0;
    fields.forEach(f => {
        totalTREO += f.treo_mt || 0;
    });
    if (totalTREO > globalMaxTREO) globalMaxTREO = totalTREO;

    // Add a minimum cap so low-reserve clusters still show somewhat visibly but small
});

Object.values(grid).forEach(fields => {
    let sumLat = 0, sumLng = 0;
    let totalTREO = 0, totalOre = 0;
    fields.forEach(f => {
        sumLat += f.lat;
        sumLng += f.lng;
        totalTREO += f.treo_mt || 0;
        totalOre += f.ore_mt || 0;
    });

    const centroidLat = sumLat / fields.length;
    const centroidLng = sumLng / fields.length;
    const count = fields.length;

    // Determine type by status
    let reeStatus = 'occurrence';
    let producers = 0;
    let occurrences = 0;
    fields.forEach(f => {
        if (f.status && f.status.toLowerCase().includes('producer')) producers++;
        else occurrences++;
    });
    if (producers > 0) reeStatus = 'producer';

    // Top country for cluster
    const countryCounts = {};
    fields.forEach(f => {
        const c = f.country || 'Unknown';
        countryCounts[c] = (countryCounts[c] || 0) + 1;
    });
    const primaryCountry = Object.keys(countryCounts).reduce((a, b) => countryCounts[a] > countryCounts[b] ? a : b);

    // Aggregate commodities to find the most common ones in this cluster
    const commodCounts = {};
    fields.forEach(f => {
        if (f.commods && f.commods !== 'Unknown' && f.commods.trim() !== '') {
            // Commods are usually comma separated like "Y, Nb, REE"
            const parts = f.commods.split(',');
            parts.forEach(p => {
                const commod = p.trim();
                if (commod) {
                    commodCounts[commod] = (commodCounts[commod] || 0) + 1;
                }
            });
        }
    });

    let topCommods = [];
    if (Object.keys(commodCounts).length > 0) {
        topCommods = Object.entries(commodCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4) // keeping top 4 mentions
            .map(entry => entry[0]);
    }
    const commodsString = topCommods.length > 0 ? topCommods.join(', ') : 'Unknown';

    // Calculate radius
    // Since REE has many more occurrences with 0 TREO than Oil/Gas, we need a baseline radius for pure occurrences
    // and a larger dynamic radius for actual reserve volume.
    const hasData = totalTREO > 0;
    const logTREO = hasData ? Math.log10(totalTREO + 1) : 0;
    const logMax = Math.log10(globalMaxTREO + 1);

    let radiusMeters;
    if (hasData) {
        radiusMeters = Math.max(30000, (logTREO / logMax) * 200000);
    } else {
        radiusMeters = 15000 + (Math.min(count, 100) / 100) * 15000;
    }

    const formatTreo = (v) => {
        if (v > 0) return (v).toFixed(2) + ' million tonnes';
        return 'No data';
    };

    clusteredOutput.push({
        name: count === 1 ? fields[0].name : `${count} REE occurrences`,
        primaryCountry,
        status: reeStatus,
        totalTreo: totalTREO,
        totalTreoFormatted: formatTreo(totalTREO),
        topCommodities: commodsString,
        count,
        lat: centroidLat,
        lng: centroidLng,
        radius: radiusMeters,
        hasReserves: hasData
    });
});

clusteredOutput.sort((a, b) => b.totalTreo - a.totalTreo);

fs.writeFileSync('../../data/ree_fields_clustered.json', JSON.stringify(clusteredOutput));
console.log(`Clustered ${rawData.length} REE fields into ${clusteredOutput.length} clusters.`);
