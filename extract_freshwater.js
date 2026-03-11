const fs = require('fs');
const https = require('https');

// World Bank API URLs for freshwater data
const TOTAL_URL = 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.K3?format=json&per_page=300&date=2020';
const PERCAPITA_URL = 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.PC?format=json&per_page=300&date=2020';

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Known regional/aggregate codes to exclude (not actual countries)
const EXCLUDED_CODES = new Set([
    'AFE', 'AFW', 'ARB', 'CSS', 'CEB', 'EAR', 'EAS', 'EAP', 'TEA',
    'EMU', 'ECS', 'ECA', 'TEC', 'EUU', 'FCS', 'HPC', 'IBD', 'IBT',
    'IDB', 'IDX', 'IDA', 'LTE', 'LCN', 'LAC', 'TLA', 'LDC', 'LMY',
    'LTE', 'MEA', 'MNA', 'TMN', 'MIC', 'NAC', 'OED', 'OSS', 'PSS',
    'PST', 'PRE', 'SST', 'SAS', 'TSA', 'SSF', 'SSA', 'TSS', 'WLD',
    '', // empty code entries
]);

// Country centroids (ISO3 -> [lat, lng]) for placing bubbles on the globe
// Sourced from standard reference data
const COUNTRY_CENTROIDS = {
    AFG: [33.94, 67.71], ALB: [41.15, 20.17], DZA: [28.03, 1.66],
    AGO: [-11.2, 17.87], ATG: [17.06, -61.8], ARG: [-38.42, -63.62],
    ARM: [40.07, 45.04], AUS: [-25.27, 133.78], AUT: [47.52, 14.55],
    AZE: [40.14, 47.58], BHS: [25.03, -77.4], BHR: [26.07, 50.55],
    BGD: [23.68, 90.36], BRB: [13.19, -59.54], BLR: [53.71, 27.95],
    BEL: [50.5, 4.47], BLZ: [17.19, -88.5], BEN: [9.31, 2.32],
    BTN: [27.51, 90.43], BOL: [-16.29, -63.59], BIH: [43.92, 17.68],
    BWA: [-22.33, 24.68], BRA: [-14.24, -51.93], BRN: [4.54, 114.73],
    BGR: [42.73, 25.49], BFA: [12.24, -1.56], BDI: [-3.37, 29.92],
    CPV: [16.0, -24.01], KHM: [12.57, 104.99], CMR: [7.37, 12.35],
    CAN: [56.13, -106.35], CAF: [6.61, 20.94], TCD: [15.45, 18.73],
    CHL: [-35.68, -71.54], CHN: [35.86, 104.2], COL: [4.57, -74.3],
    COM: [-11.88, 43.87], COD: [-4.04, 21.76], COG: [-0.23, 15.83],
    CRI: [9.75, -83.75], CIV: [7.54, -5.55], HRV: [45.1, 15.2],
    CUB: [21.52, -77.78], CYP: [35.13, 33.43], CZE: [49.82, 15.47],
    DNK: [56.26, 9.5], DJI: [11.83, 42.59], DMA: [15.41, -61.37],
    DOM: [18.74, -70.16], ECU: [-1.83, -78.18], EGY: [26.82, 30.8],
    SLV: [13.79, -88.9], GNQ: [1.65, 10.27], ERI: [15.18, 39.78],
    EST: [58.6, 25.01], SWZ: [-26.52, 31.47], ETH: [9.15, 40.49],
    FJI: [-17.71, 178.07], FIN: [61.92, 25.75], FRA: [46.23, 2.21],
    GAB: [-0.8, 11.61], GMB: [13.44, -15.31], GEO: [42.32, 43.36],
    DEU: [51.17, 10.45], GHA: [7.95, -1.02], GRC: [39.07, 21.82],
    GRD: [12.12, -61.68], GTM: [15.78, -90.23], GIN: [9.95, -9.7],
    GNB: [11.8, -15.18], GUY: [4.86, -58.93], HTI: [18.97, -72.29],
    HND: [15.2, -86.24], HUN: [47.16, 19.5], ISL: [64.96, -19.02],
    IND: [20.59, 78.96], IDN: [-0.79, 113.92], IRN: [32.43, 53.69],
    IRQ: [33.22, 43.68], IRL: [53.41, -8.24], ISR: [31.05, 34.85],
    ITA: [41.87, 12.57], JAM: [18.11, -77.3], JPN: [36.2, 138.25],
    JOR: [30.59, 36.24], KAZ: [48.02, 66.92], KEN: [-0.02, 37.91],
    PRK: [40.34, 127.51], KOR: [35.91, 127.77], KWT: [29.31, 47.48],
    KGZ: [41.2, 74.77], LAO: [19.86, 102.5], LVA: [56.88, 24.6],
    LBN: [33.85, 35.86], LSO: [-29.61, 28.23], LBR: [6.43, -9.43],
    LBY: [26.34, 17.23], LTU: [55.17, 23.88], LUX: [49.82, 6.13],
    MDG: [-18.77, 46.87], MWI: [-13.25, 34.3], MYS: [4.21, 101.98],
    MDV: [3.2, 73.22], MLI: [17.57, -4.0], MLT: [35.94, 14.38],
    MRT: [21.01, -10.94], MUS: [-20.35, 57.55], MEX: [23.63, -102.55],
    MDA: [47.41, 28.37], MNG: [46.86, 103.85], MAR: [31.79, -7.09],
    MOZ: [-18.67, 35.53], MMR: [21.91, 95.96], NAM: [-22.96, 18.49],
    NRU: [-0.52, 166.93], NPL: [28.39, 84.12], NLD: [52.13, 5.29],
    NZL: [-40.9, 174.89], NIC: [12.87, -85.21], NER: [17.61, 8.08],
    NGA: [9.08, 8.68], MKD: [41.51, 21.75], NOR: [60.47, 8.47],
    OMN: [21.47, 55.98], PAK: [30.38, 69.35], PAN: [8.54, -80.78],
    PNG: [-6.31, 143.96], PRY: [-23.44, -58.44], PER: [-9.19, -75.02],
    PHL: [12.88, 121.77], POL: [51.92, 19.15], PRT: [39.4, -8.22],
    PRI: [18.22, -66.59], QAT: [25.35, 51.18], ROU: [45.94, 24.97],
    RUS: [61.52, 105.32], RWA: [-1.94, 29.87], STP: [0.19, 6.61],
    SAU: [23.89, 45.08], SEN: [14.5, -14.45], SRB: [44.02, 21.01],
    SLE: [8.46, -11.78], SGP: [1.35, 103.82], SVK: [48.67, 19.7],
    SVN: [46.15, 14.99], SLB: [-9.65, 160.16], SOM: [5.15, 46.2],
    ZAF: [-30.56, 22.94], SSD: [6.88, 31.31], ESP: [40.46, -3.75],
    LKA: [7.87, 80.77], KNA: [17.36, -62.78], LCA: [13.91, -60.98],
    VCT: [12.98, -61.29], SDN: [12.86, 30.22], SUR: [3.92, -56.03],
    SWE: [60.13, 18.64], CHE: [46.82, 8.23], SYR: [34.8, 38.99],
    TJK: [38.86, 71.28], TZA: [-6.37, 34.89], THA: [15.87, 100.99],
    TLS: [-8.87, 125.73], TGO: [8.62, 1.21], TTO: [10.69, -61.22],
    TUN: [33.89, 9.54], TUR: [38.96, 35.24], TKM: [38.97, 59.56],
    UGA: [1.37, 32.29], UKR: [48.38, 31.17], ARE: [23.42, 53.85],
    GBR: [55.38, -3.44], USA: [37.09, -95.71], URY: [-32.52, -55.77],
    UZB: [41.38, 64.59], VUT: [-15.38, 166.96], VEN: [6.42, -66.59],
    VNM: [14.06, 108.28], PSE: [31.95, 35.23], YEM: [15.55, 48.52],
    ZMB: [-13.13, 28.64], ZWE: [-19.02, 29.15], AND: [42.55, 1.6],
    ASM: [-14.27, -170.13], ABW: [12.51, -69.97], BMU: [32.32, -64.76],
    VGB: [18.42, -64.64], CYM: [19.51, -80.57], CHI: [49.21, -2.13],
    FRO: [61.89, -6.91], GIB: [36.14, -5.35], GRL: [71.71, -42.6],
    GUM: [13.44, 144.79], HKG: [22.4, 114.11], IMN: [54.24, -4.55],
    XKX: [42.6, 20.9], LIE: [47.17, 9.56], MAC: [22.17, 113.54],
    MHL: [7.13, 171.18], FSM: [7.43, 150.55], MCO: [43.75, 7.41],
    MNE: [42.71, 19.37], NCL: [-20.9, 165.62], MNP: [15.1, 145.74],
    PLW: [7.51, 134.58], PYF: [-17.68, -149.41], SMR: [43.94, 12.46],
    SXM: [18.03, -63.05], SYC: [-4.68, 55.49], WSM: [-13.76, -172.1],
    MAF: [18.07, -63.05], KIR: [1.87, -157.36], TCA: [21.69, -71.8],
    TUV: [-7.11, 177.65], VIR: [18.34, -64.93], TON: [-21.18, -175.2],
    CUW: [12.17, -68.99], SWZ: [-26.52, 31.47],
};

async function main() {
    console.log('Fetching freshwater data from World Bank API...');

    const [totalRes, pcRes] = await Promise.all([
        fetchJSON(TOTAL_URL),
        fetchJSON(PERCAPITA_URL)
    ]);

    const totalData = totalRes[1]; // API returns [metadata, data]
    const pcData = pcRes[1];

    // Build per-capita lookup by ISO3
    const pcMap = {};
    pcData.forEach(entry => {
        if (entry.countryiso3code && entry.value !== null) {
            pcMap[entry.countryiso3code] = entry.value;
        }
    });

    // Process total data, filtering out aggregates
    const countries = [];
    totalData.forEach(entry => {
        const iso3 = entry.countryiso3code;
        if (!iso3 || EXCLUDED_CODES.has(iso3) || entry.value === null) return;

        const centroid = COUNTRY_CENTROIDS[iso3];
        if (!centroid) {
            console.log(`  Skipping ${entry.country.value} (${iso3}) - no centroid data`);
            return;
        }

        countries.push({
            country: entry.country.value,
            iso3: iso3,
            lat: centroid[0],
            lng: centroid[1],
            totalFreshwater_billionM3: entry.value,
            perCapita_m3: pcMap[iso3] || null,
        });
    });

    console.log(`\nExtracted ${countries.length} countries with freshwater data.`);

    // Stats
    const withPC = countries.filter(c => c.perCapita_m3 !== null).length;
    console.log(`Countries with per-capita data: ${withPC}`);

    const topTotal = [...countries].sort((a, b) => b.totalFreshwater_billionM3 - a.totalFreshwater_billionM3).slice(0, 10);
    console.log('\nTop 10 by total freshwater (billion m³):');
    topTotal.forEach((c, i) => console.log(`  ${i + 1}. ${c.country}: ${c.totalFreshwater_billionM3}`));

    // Water stress categories (per capita):
    // < 500: Absolute scarcity
    // 500-1000: Chronic water shortage
    // 1000-1700: Water stress
    // > 1700: Sufficient
    countries.forEach(c => {
        if (c.perCapita_m3 === null) {
            c.stressLevel = 'no_data';
        } else if (c.perCapita_m3 < 500) {
            c.stressLevel = 'absolute_scarcity';
        } else if (c.perCapita_m3 < 1000) {
            c.stressLevel = 'chronic_shortage';
        } else if (c.perCapita_m3 < 1700) {
            c.stressLevel = 'water_stress';
        } else {
            c.stressLevel = 'sufficient';
        }
    });

    const stressCounts = {};
    countries.forEach(c => {
        stressCounts[c.stressLevel] = (stressCounts[c.stressLevel] || 0) + 1;
    });
    console.log('\nWater stress distribution:');
    Object.entries(stressCounts).forEach(([level, count]) => {
        console.log(`  ${level}: ${count} countries`);
    });

    fs.writeFileSync('freshwater_data.json', JSON.stringify(countries, null, 2));
    console.log('\nSaved to freshwater_data.json');
}

main().catch(console.error);
