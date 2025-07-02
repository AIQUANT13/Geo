// // App.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet';

// function ResetMapView({ bounds }) {
//   const map = useMap();
//   useEffect(() => {
//     if (bounds) {
//       map.fitBounds(bounds); // Zoom the map to the rectangle bounds
//     }
//   }, [map, bounds]);
//   return null;
// }

// function App() {
//   const [category, setCategory] = useState('Rural'); // 'Rural' or 'Urban'
//   const [districts, setDistricts] = useState([]);
//   const [talukas, setTalukas] = useState([]);
//   const [villages, setVillages] = useState([]);
//   const [plots, setPlots] = useState([]);

//   const [selectedDistrict, setSelectedDistrict] = useState('');
//   const [selectedTaluka, setSelectedTaluka] = useState('');
//   const [selectedVillage, setSelectedVillage] = useState('');
//   const [selectedPlot, setSelectedPlot] = useState('');
//   const [bounds, setBounds] = useState(null); // [[lat1, lon1], [lat2, lon2]]

//   // Fetch districts on mount
//   useEffect(() => {
//     axios.get('http://localhost:5000/api/districts')
//       .then(res => setDistricts(res.data))
//       .catch(err => console.error(err));
//   }, []);

//   // When district changes, fetch talukas and reset downstream filters
//   useEffect(() => {
//     if (selectedDistrict) {
//       axios.get(`http://localhost:5000/api/talukas?district=${selectedDistrict}`)
//         .then(res => setTalukas(res.data))
//         .catch(err => console.error(err));
//       setSelectedTaluka('');
//       setVillages([]);
//       setSelectedVillage('');
//       setPlots([]);
//       setSelectedPlot('');
//       setBounds(null);
//     }
//   }, [selectedDistrict]);

//   // When taluka or category changes, fetch villages
//   useEffect(() => {
//     if (selectedDistrict && selectedTaluka && category) {
//       axios.get(`http://localhost:5000/api/villages?district=${selectedDistrict}&taluka=${selectedTaluka}&category=${category}`)
//         .then(res => setVillages(res.data))
//         .catch(err => console.error(err));
//       setSelectedVillage('');
//       setPlots([]);
//       setSelectedPlot('');
//       setBounds(null);
//     }
//   }, [selectedDistrict, selectedTaluka, category]);

//   // (Optional) When village changes, fetch plots (if an API exists)
//   useEffect(() => {
//     if (selectedDistrict && selectedTaluka && selectedVillage && category) {
//       // Example: fetch plot numbers for this village, if available
//       axios.get(`http://localhost:5000/api/plots?district=${selectedDistrict}&taluka=${selectedTaluka}&village=${selectedVillage}&category=${category}`)
//         .then(res => setPlots(res.data))
//         .catch(err => console.error(err));
//       setSelectedPlot('');
//       setBounds(null);
//     }
//   }, [selectedDistrict, selectedTaluka, selectedVillage, category]);

//   // When any selection changes, fetch coordinates for bounding box
//   useEffect(() => {
//     if (selectedDistrict && selectedTaluka && selectedVillage && category) {
//       let url = `http://localhost:5000/api/coordinates?district=${selectedDistrict}` +
//                 `&taluka=${selectedTaluka}` +
//                 `&village=${selectedVillage}` +
//                 `&category=${category}`;
//       if (selectedPlot) {
//         url += `&plotNo=${selectedPlot}`;
//       }
//       axios.get(url)
//         .then(res => {
//           // Assume API returns an array: [[lat1, lon1], [lat2, lon2]]
//           setBounds(res.data);
//         })
//         .catch(err => console.error(err));
//     }
//   }, [selectedDistrict, selectedTaluka, selectedVillage, selectedPlot, category]);

//   return (
//     <div className="container mt-4">
//       <h2>Maharashtra Map Filter</h2>
//       <div className="row">
//         <div className="col-md-3">
//           {/* Category Dropdown */}
//           <div className="form-group">
//             <label>Category</label>
//             <select className="form-control" value={category}
//                     onChange={e => { setCategory(e.target.value); }}>
//               <option value="">Select Category</option>
//               <option value="Rural">Rural</option>
//               <option value="Urban">Urban</option>
//             </select>
//           </div>
//           {/* District Dropdown */}
//           <div className="form-group">
//             <label>District</label>
//             <select className="form-control" value={selectedDistrict}
//                     onChange={e => setSelectedDistrict(e.target.value)}>
//               <option value="">Select District</option>
//               {districts.map(d => (
//                 <option key={d} value={d}>{d}</option>
//               ))}
//             </select>
//           </div>
//           {/* Taluka Dropdown */}
//           <div className="form-group">
//             <label>Taluka</label>
//             <select className="form-control" value={selectedTaluka}
//                     onChange={e => setSelectedTaluka(e.target.value)}>
//               <option value="">Select Taluka</option>
//               {talukas.map(t => (
//                 <option key={t} value={t}>{t}</option>
//               ))}
//             </select>
//           </div>
//           {/* Village Dropdown */}
//           <div className="form-group">
//             <label>Village</label>
//             <select className="form-control" value={selectedVillage}
//                     onChange={e => setSelectedVillage(e.target.value)}>
//               <option value="">Select Village</option>
//               {villages.map(v => (
//                 <option key={v} value={v}>{v}</option>
//               ))}
//             </select>
//           </div>
//           {/* Plot No Dropdown (if data available) */}
//           <div className="form-group">
//             <label>Plot No</label>
//             <select className="form-control" value={selectedPlot}
//                     onChange={e => setSelectedPlot(e.target.value)}>
//               <option value="">Select Plot No</option>
//               {plots.map(p => (
//                 <option key={p} value={p}>{p}</option>
//               ))}
//             </select>
//           </div>
//         </div>
//         <div className="col-md-9">
//           {/* Map */}
//           <MapContainer center={[19.0, 75.0]} zoom={7} style={{ height: '500px', width: '100%' }}>
//             <TileLayer
//               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
//             {bounds && (
//               <Rectangle bounds={bounds} pathOptions={{ color: 'blue', weight: 2 }} />
//             )}
//             <ResetMapView bounds={bounds} />
//           </MapContainer>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;

/*
Frontend Code for MERN App using React, Bootstrap, and Leaflet
Install dependencies:
  npm install react react-dom react-leaflet leaflet axios bootstrap
*/

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';

// Component to fit map view when geoJson layer updates
function FitGeoBounds({ geoJsonRef }) {
  const map = useMap();
  useEffect(() => {
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current;
      const bounds = layer.getBounds();
      if (bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds);
      }
    }
  });
  return null;
}

function App() {
  const [category, setCategory] = useState('Rural');
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluka, setSelectedTaluka] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [geoData, setGeoData] = useState(null);
  const geoJsonRef = useRef(null);

  // Load districts
  useEffect(() => {
    axios.get('http://localhost:5000/api/districts')
      .then(res => setDistricts(res.data))
      .catch(err => console.error(err));
  }, []);

  // Load talukas when district changes
  useEffect(() => {
    if (selectedDistrict) {
      setTalukas([]); setVillages([]); setSelectedTaluka(''); setSelectedVillage('');
      setGeoData(null);
      axios.get(`http://localhost:5000/api/talukas?district=${encodeURIComponent(selectedDistrict)}`)
        .then(res => setTalukas(res.data))
        .catch(err => console.error(err));
    }
  }, [selectedDistrict]);

  // Load villages when taluka or category changes
  useEffect(() => {
    if (selectedDistrict && selectedTaluka) {
      setVillages([]); setSelectedVillage(''); setGeoData(null);
      let url = `http://localhost:5000/api/villages?district=${encodeURIComponent(selectedDistrict)}` +
                `&taluka=${encodeURIComponent(selectedTaluka)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      axios.get(url)
        .then(res => setVillages(res.data))
        .catch(err => console.error(err));
    }
  }, [selectedTaluka, category]);

  // Fetch geometry when selection updates
  useEffect(() => {
    if (selectedDistrict && selectedTaluka && selectedVillage) {
      let url = `http://localhost:5000/api/coordinates?district=${encodeURIComponent(selectedDistrict)}` +
                `&taluka=${encodeURIComponent(selectedTaluka)}` +
                `&village=${encodeURIComponent(selectedVillage)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      axios.get(url)
        .then(res => setGeoData(res.data))
        .catch(err => console.error(err));
    }
  }, [selectedVillage]);

  return (
    <div className="container mt-4">
      <h2>Maharashtra Map Filter</h2>
      <div className="row">
        <div className="col-md-3">
          {/* Category */}
          <div className="mb-3">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Rural">Rural</option>
              <option value="Urban">Urban</option>
            </select>
          </div>
          {/* District */}
          <div className="mb-3">
            <label className="form-label">District</label>
            <select className="form-select" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
              <option value="">Select District</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* Taluka */}
          <div className="mb-3">
            <label className="form-label">Taluka</label>
            <select className="form-select" value={selectedTaluka} onChange={e => setSelectedTaluka(e.target.value)}>
              <option value="">Select Taluka</option>
              {talukas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* Village */}
          <div className="mb-3">
            <label className="form-label">Village</label>
            <select className="form-select" value={selectedVillage} onChange={e => setSelectedVillage(e.target.value)}>
              <option value="">Select Village</option>
              {villages.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="col-md-9">
          <MapContainer center={[19.7515, 75.7139]} zoom={7} style={{ height: '600px', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geoData && (
              <GeoJSON
                data={geoData}
                style={{ color: 'blue', weight: 2, fillOpacity: 0.1 }}
                ref={geoJsonRef}
              />
            )}
            {geoData && <FitGeoBounds geoJsonRef={geoJsonRef} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
