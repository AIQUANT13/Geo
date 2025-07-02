import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());

// import mh1 from '../geojson/mh1.geojson'; // Load Maharashtra village GeoJSON (DataMeet); files must be placed in server/geojson/
// import mh2 from '../geojson/mh2.geojson'; // Load Maharashtra village GeoJSON (DataMeet); files must be placed in server/geojson/

// Load Maharashtra village GeoJSON (DataMeet); files must be placed in server/geojson/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mh1 = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'geojson', 'mh1.geojson'), 'utf8')
);
const mh2 = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'geojson', 'mh2.geojson'), 'utf8')
);

const villages = mh1.features.concat(mh2.features);

// Helper to filter and compute bounding box
function filterFeatures(query) {
    // Filter by district, taluka, village, and category (TYPE)
    let filtered = villages;
    if (query.district) {
        filtered = filtered.filter(f => f.properties.DISTRICT === query.district);
    }
    if (query.taluka) {
        filtered = filtered.filter(f => f.properties.SUB_DIST === query.taluka);
    }
    if (query.village) {
        filtered = filtered.filter(f => f.properties.NAME === query.village);
    }
    if (query.category) {
        if (query.category === 'Urban') {
            filtered = filtered.filter(f => f.properties.TYPE === 'Town');
        } else if (query.category === 'Rural') {
            filtered = filtered.filter(f => f.properties.TYPE === 'Village');
        }
    }
    return filtered;
}

// Compute bounding box [minLat, minLng, maxLat, maxLng] for given features
function computeBounds(features) {
    let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
    features.forEach(f => {
        // f.geometry.coordinates is an array of coordinates (may be MultiPolygon)
        const coords = f.geometry.coordinates;
        // Recursively handle nested arrays
        const traverse = arr => arr.forEach(item => {
            if (typeof item[0] === 'number') {
                // coordinate [lng, lat]
                const lng = item[0], lat = item[1];
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
            } else {
                traverse(item);
            }
        });
        traverse(coords);
    });
    return { minLat, minLng, maxLat, maxLng };
}

// Endpoint: list of districts
app.get('/api/districts', (req, res) => {
    const districts = [...new Set(villages.map(f => f.properties.DISTRICT))];
    districts.sort();
    res.json(districts);
});

// Endpoint: list of talukas in a district
app.get('/api/talukas', (req, res) => {
    const district = req.query.district;
    if (!district) return res.status(400).json({ error: 'Missing district' });
    const talukas = [...new Set(
        villages
            .filter(f => f.properties.DISTRICT === district)
            .map(f => f.properties.SUB_DIST)
    )];
    talukas.sort();
    res.json(talukas);
});

// Endpoint: list of villages in a district & taluka (and category)
app.get('/api/villages', (req, res) => {
    const { district, taluka, category } = req.query;
    console.log('[API] /api/villages called with:', req.query);
    if (!district || !taluka) {
        return res.status(400).json({ error: 'Missing district or taluka' });
    }

    // Inline filtering over your loaded villages array
    const filtered = villages.filter(f => {
        const props = f.properties;
        // match district & taluka (case-insensitive)
        const districtMatch = props.DISTRICT?.toLowerCase() === district.toLowerCase();
        const talukaMatch = props.SUB_DIST?.toLowerCase() === taluka.toLowerCase();
        // match category if provided
        let categoryMatch = true;
        if (category) {
            if (category === 'Rural') {
                categoryMatch = props.TYPE?.toLowerCase() === 'village';
            } else if (category === 'Urban') {
                categoryMatch = props.TYPE?.toLowerCase() === 'town';
            }
        }
        return districtMatch && talukaMatch && categoryMatch;
    });

    console.log('[API] Filtered features count:', filtered.length);

    // extract village/town names
    const names = filtered.map(f => f.properties.NAME);
    const uniq = Array.from(new Set(names)).sort();

    console.log('[API] Unique villages:', uniq.length);
    res.json(uniq);
});


// list plot numbers in the selected village
app.get('/api/plots', async (req, res) => {
    const { district, taluka, village, category } = req.query;
    console.log('[API] /api/plots called with:', req.query);

    if (!district || !taluka || !village) {
        return res.status(400).json({ error: 'Missing district, taluka or village' });
    }

    // Filter your GeoJSON features to find the village polygon(s)
    const villageFeatures = villages.filter(f => {
        const props = f.properties;
        const districtMatch = props.DISTRICT?.toLowerCase() === district.toLowerCase();
        const talukaMatch = props.SUB_DIST?.toLowerCase() === taluka.toLowerCase();
        const villageMatch = props.NAME?.toLowerCase() === village.toLowerCase();
        let categoryMatch = true;
        if (category) {
            if (category === 'Rural') {
                categoryMatch = props.TYPE?.toLowerCase() === 'village';
            } else if (category === 'Urban') {
                categoryMatch = props.TYPE?.toLowerCase() === 'town';
            }
        }
        return districtMatch && talukaMatch && villageMatch && categoryMatch;
    });

    console.log('[API] Matched village features count:', villageFeatures.length);
    if (villageFeatures.length === 0) {
        return res.status(404).json({ error: 'No matching village found' });
    }

    // Compute its bounding box
    const { minLat, minLng, maxLat, maxLng } = computeBounds(villageFeatures);

    // Build the WFS URL to fetch cadastral parcels in that bbox
    // (Replace 'bhunaksha:parcels' and 'plot_no' with the actual layer/name used)
    const bboxParam = `${minLng},${minLat},${maxLng},${maxLat}`;
    const wfsUrl =
        'https://bhunaksha.maharashtra.gov.in/geoserver/bhunaksha/ows' +
        '?service=WFS' +
        '&version=1.0.0' +
        '&request=GetFeature' +
        '&typeName=bhunaksha:parcels' +
        '&outputFormat=application/json' +
        `&bbox=${bboxParam},EPSG:4326`;

    try {
        //Fetch parcel features from the GeoServer
        const response = await fetch(wfsUrl);
        if (!response.ok) {
            throw new Error(`WFS request failed: ${response.statusText}`);
        }
        const geojson = await response.json();

        // Extract the plot-number property from each feature
        const plots = geojson.features
            .map(f => f.properties.plot_no)   // adjust 'plot_no' if needed
            .filter(p => p !== undefined && p !== null);

        // Deduplicate and sort
        const uniquePlots = Array.from(new Set(plots)).sort((a, b) => {
            // numeric sort if all-numeric, else lexicographic
            const na = Number(a), nb = Number(b);
            return !isNaN(na) && !isNaN(nb) ? na - nb : `${a}`.localeCompare(b);
        });

        console.log('[API] Found plots:', uniquePlots.length);
        return res.json(uniquePlots);

    } catch (err) {
        console.error('Error fetching plots:', err);
        return res.status(500).json({ error: 'Failed to fetch plot data' });
    }
});


// Endpoint: bounding box coordinates for selected area
// (district only, or with taluka, or with village, plus category filter)
app.get('/api/coordinates', (req, res) => {
    const { district, taluka, village, category } = req.query;
    if (!district) return res.status(400).json({ error: 'Missing district' });

    const matched = villages.filter(f => {
        const p = f.properties;
        // District must match
        const districtMatch = p.DISTRICT?.toLowerCase() === district.toLowerCase();
        // Taluka match if provided
        const talukaMatch = taluka
            ? p.SUB_DIST?.toLowerCase() === taluka.toLowerCase()
            : true;
        // Village match if provided
        const villageMatch = village
            ? p.NAME?.toLowerCase() === village.toLowerCase()
            : true;
        // Category match if provided
        let categoryMatch = true;
        if (category) {
            categoryMatch = category === 'Rural'
                ? p.TYPE?.toLowerCase() === 'village'
                : p.TYPE?.toLowerCase() === 'town';
        }
        return districtMatch && talukaMatch && villageMatch && categoryMatch;
    });

    console.log('[API] Matched features count:', matched.length);
    if (matched.length === 0) {
        return res.status(404).json({ error: 'No matching area found' });
    }
    const bounds = computeBounds(matched);
    console.log('[API] Computed bounds:', bounds);
    const featureCollection = {
        type: 'FeatureCollection',
        features: matched
    };
    res.json(featureCollection);
});

// Start server
const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
