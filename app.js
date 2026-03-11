document.addEventListener("DOMContentLoaded", () => {
    Cesium.Ion.defaultAccessToken = '';

    const viewer = new Cesium.Viewer('cesiumContainer', {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        skyBox: false, // Disables the bullshit starry background
        skyAtmosphere: false,

        requestRenderMode: false,
        // Esri Dark Gray Canvas basemap
        baseLayer: new Cesium.ImageryLayer(
            new Cesium.UrlTemplateImageryProvider({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                credit: 'Esri',
                tileWidth: 256,
                tileHeight: 256
            })
        )
    });

    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a1a');
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a1a');

    const tooltip = document.getElementById('tooltip');

    // ========== LAYER SYSTEM ==========
    // Each layer has: name, entities datasource, visible state
    const layers = {};

    function registerLayer(id, name, color) {
        const dataSource = new Cesium.CustomDataSource(id);
        viewer.dataSources.add(dataSource);
        dataSource.show = false; // default to off
        layers[id] = { id, name, color, dataSource, visible: false }; // default to off
        return dataSource;
    }

    function toggleLayer(id) {
        const layer = layers[id];
        if (!layer) return;
        layer.visible = !layer.visible;
        layer.dataSource.show = layer.visible;
    }

    function buildLayerPanel() {
        const panel = document.getElementById('layer-panel');
        panel.innerHTML = '';

        Object.values(layers).forEach(layer => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.innerHTML = `
                <label class="layer-toggle">
                    <input type="checkbox" ${layer.visible ? 'checked' : ''} data-layer="${layer.id}">
                    <span class="layer-dot" style="background:${layer.color}"></span>
                    <span class="layer-name">${layer.name}</span>
                </label>
            `;
            item.querySelector('input').addEventListener('change', (e) => {
                toggleLayer(e.target.dataset.layer);
            });
            panel.appendChild(item);
        });
    }

    // Color scheme by fuel type
    const COLORS = {
        oil: { fill: '#ef4444', outline: '#ff7777', label: '🛢️ Oil' },
        gas: { fill: '#3b82f6', outline: '#60a5fa', label: '🔵 Natural Gas' },
        unknown: { fill: '#6b7280', outline: '#9ca3af', label: '⚫ No Reserve Data' }
    };

    // Color scheme by REE type
    const REE_COLORS = {
        producer: { fill: '#f59e0b', outline: '#fbbf24', label: '⚒️ REE Producer' },
        occurrence: { fill: '#10b981', outline: '#34d399', label: '💎 REE Occurrence' },
        unknown: { fill: '#6b7280', outline: '#9ca3af', label: '⚫ No Target Data' }
    };

    // ========== OIL & GAS RESERVES LAYER ==========
    const oilDS = registerLayer('oil_reserves', 'Oil Reserves', '#ef4444');
    const gasDS = registerLayer('gas_reserves', 'Natural Gas Reserves', '#3b82f6');

    fetch('data/oil_fields_clustered.json')
        .then(response => response.json())
        .then(data => {
            const maxEnergy = Math.max(...data.map(c => c.totalOil + c.totalGas * 0.00629));

            data.forEach(cluster => {
                const totalEnergy = cluster.totalOil + cluster.totalGas * 0.00629;
                const energyLog = totalEnergy > 0 ? Math.log10(totalEnergy + 1) : 0;
                const maxLog = Math.log10(maxEnergy + 1);
                const alpha = Math.min(0.7, 0.15 + (energyLog / maxLog) * 0.55);

                const colorScheme = COLORS[cluster.fuelType] || COLORS.unknown;

                const addEntityToDS = (targetDS, overrideColorScheme) => {
                    targetDS.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(cluster.lng, cluster.lat),
                        ellipse: {
                            semiMajorAxis: cluster.radius,
                            semiMinorAxis: cluster.radius,
                            material: Cesium.Color.fromCssColorString(overrideColorScheme ? overrideColorScheme.fill : colorScheme.fill).withAlpha(alpha),
                            outline: true,
                            outlineColor: Cesium.Color.fromCssColorString(overrideColorScheme ? overrideColorScheme.outline : colorScheme.outline).withAlpha(0.6),
                            outlineWidth: 1,
                            height: 50000,
                            granularity: Cesium.Math.toRadians(0.5)
                        },
                        description: JSON.stringify(cluster)
                    });
                };

                if (cluster.fuelType === 'oil') addEntityToDS(oilDS);
                else if (cluster.fuelType === 'gas') addEntityToDS(gasDS);
                else if (cluster.fuelType === 'mixed') {
                    // For mixed, add it to both layers so it shows up when either is toggled ON
                    addEntityToDS(oilDS, COLORS.oil);
                    addEntityToDS(gasDS, COLORS.gas);
                }
            });

            // ========== RARE EARTH ELEMENTS LAYER ==========
            const reeDS = registerLayer('rare_earth_elements', 'Rare Earth Elements', '#f59e0b');

            fetch('data/ree_fields_clustered.json')
                .then(response => response.json())
                .then(reeData => {
                    reeData.forEach(cluster => {
                        const hasData = cluster.hasReserves;
                        const alpha = hasData ? 0.6 : 0.35;
                        const outlineAlpha = hasData ? 0.8 : 0.4;

                        const colorScheme = REE_COLORS[cluster.status] || REE_COLORS.unknown;

                        // Add a layer variable so the tooltip knows it's an REE cluster
                        cluster.layerType = 'ree';

                        reeDS.entities.add({
                            position: Cesium.Cartesian3.fromDegrees(cluster.lng, cluster.lat),
                            ellipse: {
                                semiMajorAxis: cluster.radius,
                                semiMinorAxis: cluster.radius,
                                material: Cesium.Color.fromCssColorString(colorScheme.fill).withAlpha(alpha),
                                outline: true,
                                outlineColor: Cesium.Color.fromCssColorString(colorScheme.outline).withAlpha(outlineAlpha),
                                outlineWidth: 1,
                                height: 50000,
                                granularity: Cesium.Math.toRadians(0.5)
                            },
                            description: JSON.stringify(cluster)
                        });
                    });

                    // Build layer panel after all data loads
                    buildLayerPanel();
                });
        });

    // ========== POLITICAL DATA & SEARCH ==========
    let politicalData = {};
    let searchIndex = [];
    let activeCapitalEntity = null;

    fetch('data/automated_political_data.json')
        .then(res => res.json())
        .then(data => {
            politicalData = data;

            // Build the search index dynamically
            for (let iso3 in data) {
                if (data[iso3].country) {
                    searchIndex.push({
                        iso3: iso3,
                        name: data[iso3].country,
                        lowerName: data[iso3].country.toLowerCase()
                    });
                }
            }
            // Sort search results alphabetically
            searchIndex.sort((a, b) => a.name.localeCompare(b.name));

            if (typeof logDebug === 'function') {
                logDebug("Successfully loaded " + searchIndex.length + " countries into Search Bar!");
            }
        })
        .catch(err => {
            console.error("Error loading political data:", err);
        });

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(25.0, 20.0, 18000000.0),
        duration: 2.5,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
    });

    // ========== HOVER TOOLTIP & CLICK SELECTION ==========
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(function (movement) {
        let pickedObjects = viewer.scene.drillPick(movement.endPosition);
        let clusterObj = null;
        let countryObj = null;

        for (let i = 0; i < pickedObjects.length; i++) {
            let p = pickedObjects[i];
            if (Cesium.defined(p) && p.id && p.id.description) {
                clusterObj = p;
                break; // Prioritize clusters
            } else if (Cesium.defined(p) && p.id && p.id.capitalName) {
                countryObj = p.id;
            }
        }

        // If hovering a cluster or capital
        if (clusterObj || countryObj) {
            let html = '';

            if (clusterObj) {
                let cluster;
                let desc = clusterObj.id.description;
                try {
                    cluster = JSON.parse(typeof desc.getValue === 'function' ? desc.getValue(viewer.clock.currentTime) || desc.getValue() : desc);
                } catch (e) { return; }

                html = `<div class="tt-title">${cluster.name}</div>`;

                if (cluster.layerType === 'ree') {
                    const colorScheme = REE_COLORS[cluster.status] || REE_COLORS.unknown;
                    html += `<div class="tt-type" style="color:${colorScheme.fill}">${colorScheme.label}</div>`;
                    html += `<div class="tt-label">Top Elements</div>`;
                    html += `<div class="tt-value" style="font-weight: 600; color: #fff;">${cluster.topCommodities || 'Unknown'}</div>`;
                    html += `<div class="tt-label">TREO Reserves</div>`;
                    html += `<div class="tt-value">${cluster.totalTreoFormatted}</div>`;
                    html += `<div class="tt-label">Occurrences in Cluster</div>`;
                    html += `<div class="tt-value">${cluster.count}</div>`;
                    html += `<div class="tt-label">Primary Country</div>`;
                    html += `<div class="tt-value">${cluster.primaryCountry}</div>`;
                } else {
                    const colorScheme = COLORS[cluster.fuelType] || COLORS.unknown;
                    html += `<div class="tt-type" style="color:${colorScheme.fill}">${colorScheme.label}</div>`;
                    html += `<div class="tt-label">Oil Reserves</div>`;
                    html += `<div class="tt-value">${cluster.totalOilFormatted}</div>`;
                    html += `<div class="tt-label">Gas Reserves</div>`;
                    html += `<div class="tt-value">${cluster.totalGasFormatted}</div>`;
                    html += `<div class="tt-label">By Country</div>`;
                    html += `<div class="tt-value">${cluster.countries.join('<br>')}</div>`;
                }
            } else if (countryObj) {
                html = `<div class="tt-title" style="margin-bottom: 0;">★ ${countryObj.capitalName}</div>`;
                html += `<div class="tt-value" style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.2rem;">Capital City</div>`;
            }

            tooltip.innerHTML = html;
            tooltip.classList.add('visible');

            let x = movement.endPosition.x + 18;
            let y = movement.endPosition.y - 10;
            if (x + 320 > window.innerWidth) x = movement.endPosition.x - 340;
            if (y + 250 > window.innerHeight) y = window.innerHeight - 260;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';

            document.body.style.cursor = 'pointer';
        } else {
            // Over nothing
            tooltip.classList.remove('visible');
            document.body.style.cursor = 'default';
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // ========== SEARCH BAR LOGIC ==========
    const searchInput = document.getElementById('country-search');
    const searchResults = document.getElementById('search-results');

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', function (e) {
            const val = this.value.toLowerCase().trim();
            searchResults.innerHTML = '';

            if (val.length === 0) {
                searchResults.classList.add('hidden');
                return;
            }

            // Find top 10 matches
            let matches = searchIndex.filter(item =>
                item.lowerName.includes(val) ||
                item.iso3.toLowerCase() === val
            ).slice(0, 10);

            if (matches.length > 0) {
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerText = match.name;
                    div.addEventListener('click', () => {
                        // Open Panel
                        openCountryPanel(match.iso3);
                        // Clear Search
                        searchResults.classList.add('hidden');
                        searchInput.value = '';

                        // Spin earth to country location if known
                        let pdata = politicalData[match.iso3] || {};
                        if (pdata.location) {
                            viewer.camera.flyTo({
                                destination: Cesium.Cartesian3.fromDegrees(
                                    pdata.location.lng,
                                    pdata.location.lat,
                                    5000000.0 // Adjusted Altitude for framing
                                ),
                                duration: 1.5,
                                easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
                            });
                        }
                    });
                    searchResults.appendChild(div);
                });
                searchResults.classList.remove('hidden');
            } else {
                searchResults.classList.add('hidden');
            }
        });

        // Handle Enter key to select the first option
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!searchResults.classList.contains('hidden')) {
                    const firstItem = searchResults.querySelector('.search-item');
                    if (firstItem) {
                        firstItem.click();
                    }
                }
            }
        });

        // Hide search dropdown if clicked outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('#search-container')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    function openCountryPanel(iso3) {
        const data = politicalData[iso3];
        if (!data) return; // No data for clicked area

        document.getElementById('cp-name').innerText = data.country;

        // Populate Capital city
        document.getElementById('cp-capital').innerText = data.capital ? "Capital: " + data.capital : "Capital: Unknown";

        document.getElementById('cp-gov').innerText = data.government_type;
        document.getElementById('cp-regime').innerText = "Regime: " + data.regime_type;

        document.getElementById('cp-leader').innerText = data.leader;
        document.getElementById('cp-party').innerText = data.leader_party;
        document.getElementById('cp-ideology').innerText = data.leader_ideology;

        document.getElementById('cp-opp').innerText = data.main_opposition;
        document.getElementById('cp-opp-ideology').innerText = data.opposition_ideology;

        document.getElementById('cp-stability').innerText = data.political_stability;
        document.getElementById('cp-terror').innerText = data.terror_incidents_last5y;

        const ext = data.extremist_groups || [];
        document.getElementById('cp-extremist').innerHTML = ext.join('<br>');

        const resources = data.economic_resources || {
            total_oil_mmbbl: 0, total_gas_mm3: 0, total_ree_treo_mt: 0, known_elements: []
        };

        document.getElementById('cp-oil-total').innerText = (resources.total_oil_mmbbl > 0) ? resources.total_oil_mmbbl.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' mmbbl' : 'None recorded';
        document.getElementById('cp-gas-total').innerText = (resources.total_gas_mm3 > 0) ? resources.total_gas_mm3.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' mm³' : 'None recorded';
        document.getElementById('cp-ree-total').innerText = (resources.total_ree_treo_mt > 0) ? resources.total_ree_treo_mt.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' mt TREO' : 'None recorded';

        let elementsText = 'None recorded';
        if (resources.known_elements && resources.known_elements.length > 0) {
            elementsText = resources.known_elements.join(', ');
        }
        document.getElementById('cp-elements').innerText = elementsText;

        // --- Capital City Highlighting ---
        if (activeCapitalEntity) {
            viewer.entities.remove(activeCapitalEntity);
            activeCapitalEntity = null;
        }

        if (data.capital && data.capital_location) {
            activeCapitalEntity = viewer.entities.add({
                capitalName: data.capital, // Tag for tooltip parsing
                position: Cesium.Cartesian3.fromDegrees(data.capital_location.lng, data.capital_location.lat, 500),
                ellipse: {
                    semiMajorAxis: 15000.0, // 15 km generic city radius
                    semiMinorAxis: 15000.0,
                    fill: false, // Transparent internal
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#38bdf8'),
                    outlineWidth: 3,
                    height: 500
                }
            });
        }

        document.getElementById('country-panel').classList.remove('hidden');
    }

    document.getElementById('close-cp').addEventListener('click', () => {
        document.getElementById('country-panel').classList.add('hidden');
    });

    document.getElementById('close-cp-cross').addEventListener('click', () => {
        document.getElementById('country-panel').classList.add('hidden');
    });

    // ========== 2D/3D TOGGLE ==========
    const toggleButton = document.getElementById('toggle-view');
    let is3D = true;

    toggleButton.addEventListener('click', () => {
        if (is3D) {
            viewer.scene.morphTo2D(1.5);
            toggleButton.innerText = 'Switch to 3D View';
            is3D = false;
        } else {
            viewer.scene.morphTo3D(1.5);
            toggleButton.innerText = 'Switch to 2D View';
            is3D = true;
        }
    });
});
