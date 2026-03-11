const fs = require('fs');
const https = require('https');

// URLs for all freshwater indicators
const URLS = {
    totalAvailable: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.K3?format=json&per_page=300&date=2020',
    perCapita: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.PC?format=json&per_page=300&date=2020',
    totalWithdrawal: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWTL.K3?format=json&per_page=300&date=2015:2022&mrnev=1',
    agriPct: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWAG.ZS?format=json&per_page=300&date=2015:2022&mrnev=1',
    domesticPct: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWDM.ZS?format=json&per_page=300&date=2015:2022&mrnev=1',
    industryPct: 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWIN.ZS?format=json&per_page=300&date=2015:2022&mrnev=1',
};

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// Regional/aggregate codes to exclude
const EXCLUDED = new Set([
    'AFE', 'AFW', 'ARB', 'CSS', 'CEB', 'EAR', 'EAS', 'EAP', 'TEA', 'EMU', 'ECS', 'ECA',
    'TEC', 'EUU', 'FCS', 'HPC', 'IBD', 'IBT', 'IDB', 'IDX', 'IDA', 'LTE', 'LCN', 'LAC',
    'TLA', 'LDC', 'LMY', 'MEA', 'MNA', 'TMN', 'MIC', 'NAC', 'OED', 'OSS', 'PSS', 'PST',
    'PRE', 'SST', 'SAS', 'TSA', 'SSF', 'SSA', 'TSS', 'WLD', ''
]);

// Build lookup map from API data array
function buildMap(apiData) {
    const map = {};
    apiData.forEach(entry => {
        const iso3 = entry.countryiso3code;
        if (iso3 && !EXCLUDED.has(iso3) && entry.value !== null) {
            map[iso3] = entry.value;
        }
    });
    return map;
}

async function main() {
    console.log('Fetching all freshwater indicators from World Bank...');

    const results = {};
    for (const [key, url] of Object.entries(URLS)) {
        const res = await fetchJSON(url);
        results[key] = buildMap(res[1]);
        console.log(`  ${key}: ${Object.keys(results[key]).length} countries`);
    }

    // Merge all data by ISO3
    const allISOs = new Set([
        ...Object.keys(results.totalAvailable),
        ...Object.keys(results.totalWithdrawal)
    ]);

    const countries = {};
    let matched = 0;

    for (const iso3 of allISOs) {
        const available = results.totalAvailable[iso3];
        const withdrawal = results.totalWithdrawal[iso3];

        if (!available || !withdrawal) continue;
        matched++;

        const withdrawalRatio = (withdrawal / available) * 100; // % of available used

        // Water stress classification based on withdrawal-to-availability ratio (Falkenmark)
        // <10%: Low stress | 10-20%: Low-Medium | 20-40%: Medium-High | >40%: High | >80%: Extremely High
        let stressLevel, stressColor;
        if (withdrawalRatio > 100) {
            stressLevel = 'critical_overdraw';
            stressColor = '#8B0000'; // dark red
        } else if (withdrawalRatio > 80) {
            stressLevel = 'extremely_high';
            stressColor = '#FF0000'; // red    
        } else if (withdrawalRatio > 40) {
            stressLevel = 'high';
            stressColor = '#FF6600'; // orange
        } else if (withdrawalRatio > 20) {
            stressLevel = 'medium_high';
            stressColor = '#FFD700'; // yellow
        } else if (withdrawalRatio > 10) {
            stressLevel = 'low_medium';
            stressColor = '#90EE90'; // light green
        } else {
            stressLevel = 'low';
            stressColor = '#228B22'; // green
        }

        const perCapita = results.perCapita[iso3] || null;

        countries[iso3] = {
            country: null, // will fill from API data
            iso3,

            // Supply
            totalAvailable_billionM3: available,
            perCapita_m3: perCapita ? Math.round(perCapita) : null,

            // Demand
            totalWithdrawal_billionM3: Math.round(withdrawal * 1000) / 1000,

            // Key ratio: how much of available water is being used
            withdrawalRatio_pct: Math.round(withdrawalRatio * 100) / 100,

            // Sector breakdown of withdrawals
            agriculture_pct: results.agriPct[iso3] ? Math.round(results.agriPct[iso3] * 10) / 10 : null,
            domestic_pct: results.domesticPct[iso3] ? Math.round(results.domesticPct[iso3] * 10) / 10 : null,
            industry_pct: results.industryPct[iso3] ? Math.round(results.industryPct[iso3] * 10) / 10 : null,

            // Classification
            stressLevel,
            stressColor,

            // Computed: surplus/deficit
            surplus_billionM3: Math.round((available - withdrawal) * 1000) / 1000,

            // Per capita stress (Falkenmark indicator)
            perCapitaStress: perCapita === null ? 'no_data'
                : perCapita < 500 ? 'absolute_scarcity'
                    : perCapita < 1000 ? 'chronic_shortage'
                        : perCapita < 1700 ? 'water_stress'
                            : 'sufficient',
        };
    }

    // Fill country names from the raw API data
    const rawAvailable = (await fetchJSON(URLS.totalAvailable))[1];
    rawAvailable.forEach(entry => {
        if (countries[entry.countryiso3code]) {
            countries[entry.countryiso3code].country = entry.country.value;
        }
    });
    const rawWithdrawal = (await fetchJSON(URLS.totalWithdrawal))[1];
    rawWithdrawal.forEach(entry => {
        if (countries[entry.countryiso3code] && !countries[entry.countryiso3code].country) {
            countries[entry.countryiso3code].country = entry.country.value;
        }
    });

    console.log(`\nMatched ${matched} countries with both supply and demand data.`);

    // --- Stats ---
    const stressCounts = {};
    Object.values(countries).forEach(c => {
        stressCounts[c.stressLevel] = (stressCounts[c.stressLevel] || 0) + 1;
    });
    console.log('\nWithdrawal Stress Distribution:');
    Object.entries(stressCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([level, count]) => console.log(`  ${level}: ${count} countries`));

    // Top water-stressed countries
    const sorted = Object.values(countries).sort((a, b) => b.withdrawalRatio_pct - a.withdrawalRatio_pct);
    console.log('\nTop 15 Most Water-Stressed (withdrawal/available ratio):');
    sorted.slice(0, 15).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.country} (${c.iso3}): ${c.withdrawalRatio_pct}% used | ` +
            `Available: ${c.totalAvailable_billionM3} B m³ | Withdrawal: ${c.totalWithdrawal_billionM3} B m³`);
    });

    console.log('\nTop 10 Most Water-Abundant (lowest withdrawal ratio):');
    sorted.slice(-10).reverse().forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.country} (${c.iso3}): ${c.withdrawalRatio_pct}% used | ` +
            `Available: ${c.totalAvailable_billionM3} B m³`);
    });

    // Save
    fs.writeFileSync('freshwater_ratio.json', JSON.stringify(countries, null, 2));
    console.log('\nSaved to freshwater_ratio.json');

    // Also save a minified lookup version
    fs.writeFileSync('freshwater_ratio_lookup.json', JSON.stringify(countries));
    console.log('Saved minified to freshwater_ratio_lookup.json');
}

main().catch(console.error);
