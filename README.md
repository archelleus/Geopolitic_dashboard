# Geopolitical Dashboard

An interactive, 3D/2D web-based globe visualization built with CesiumJS. It displays global geopolitical data, resource reserves (Oil, Natural Gas, and Rare Earth Elements), and demographic information, providing a comprehensive view of global political and economic landscapes.

## Features

- **Interactive 3D Globe**: Rendered using CesiumJS, with an option to seamlessly toggle between 3D and 2D map views.
- **Resource Heatmaps and Clusters**: 
  - Visual layers displaying **Oil Reserves**, **Natural Gas** fields, and **Rare Earth Elements (REE)** occurrences and producers.
  - Interactive clusters showing detailed information on extraction values, reserve totals, and top commodities on hover.
- **Detailed Political Data**: Click or search for any country to view its capital, regime type, government, current leader, main opposition, political stability, recent terror incidents, and top economic resources.
- **Search Functionality**: Quickly find and zoom directly to countries dynamically with fluid camera animations.
- **Layer Panel System**: Toggle various global datasets to customize your view dynamically.

## Data Sources & Pipeline

The project utilizes a multi-step data processing pipeline located in the `scripts/` and `scripts/js_scripts/` directories to consolidate various datasets into the frontend's `data/` folder:

- **Resource Tracking Data**: Cleaned and extracted from Global Oil, Gas, and REE extraction tracker spreadsheets (`.xlsx`).
- **Geopolitical Index**: Enriched data sourced from various proxy and manifesto databases to generate up-to-date political facts.
- **Geography**: Country borders and centroids normalized using Natural Earth `.geojson` data.
- **Freshwater Ratio**: Real-time extraction and assessment ratio of freshwater reserves.

## Project Structure

```text
Geopolitic_dashboard/
├── index.html            # Main entry point for the dashboard
├── app.js                # Core Cesium Logic and UI handlers
├── style.css             # Styling for the side panels, tooltips, and canvas
├── data/                 # Contains all clustered, joined, and minified JSON datasets
├── scripts/              # Python processing scripts for political and geometric data
│   └── js_scripts/       # Javascript (Node.js) scripts for data extraction and clustering
├── Global_REE_occurrence_database.xlsx        # Raw rare earths dataset
└── Global-Oil-and-Gas-Extraction-Tracker...   # Raw oil and gas dataset
```

## Setup & Running Locally

1. **Clone the repository:**
   ```bash
   git clone <your-repo-link>
   cd Geopolitic_dashboard
   ```

2. **Serve the project locally:**
   Since the app makes `fetch` requests to local JSON files (`data/`), you must run it through a local web server (opening `index.html` directly in the browser will result in CORS errors).
   
   If you have Python installed, you can easily spin up a server:
   ```bash
   python3 -m http.server 8000
   ```
   Or using Node.js:
   ```bash
   npx serve .
   ```

3. **Open the browser:** 
   Navigate to `http://localhost:8000` (or the port specified by your local server).

## Data Updating

If you need to re-run the data extraction and integration steps:
1. Navigate to the `scripts/` directory.
2. Ensure you have the required dependencies (`pandas`, `geopandas` for Python; `xlsx`, `puppeteer` for Node.js located in the root `package.json`).
3. Run the individual extraction or clustering scripts (e.g., `node js_scripts/extract_data.js`).

