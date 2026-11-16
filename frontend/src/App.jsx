import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createPlaneIcon = (heading = 0, isCritical = false, isSelected = false) => {
  const color = isCritical ? '#ef4444' : isSelected ? '#f59e0b' : '#38bdf8';
  const glow = isCritical
    ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.95))'
    : isSelected
    ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.95))'
    : 'drop-shadow(0 1px 3px rgba(0,0,0,0.85))';

  const svg = `
    <div style="transform: rotate(${heading}deg); filter: ${glow}; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="${color}" stroke="#0b1020" stroke-width="1.2">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-plane-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

// Helper component to smoothly fly the map camera when clicking sector presets
function MapCameraController({ targetView }) {
  const map = useMap();
  useEffect(() => {
    if (targetView) {
      map.flyTo(targetView.center, targetView.zoom, { duration: 1.2 });
    }
  }, [targetView, map]);
  return null;
}

const DEFAULT_INDIA_FLEET = [
  { id: "vt-alk", callsign: "AIC784", airline: "Air India", sector: "Hyderabad", aircraft_type: "B788 Dreamliner", phase: "Cruise", speed_kts: 475, altitude_ft: 35000, vertical_rate: 0, heading: 35, squawk: "2411", anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", diagnostic_reasoning: "ADS-B trajectory and groundspeed nominal on HYD-DEL airway.", plain_english: "Cruising smoothly north-east over Hyderabad toward Delhi.", lat: 17.3850, lng: 78.4867 },
  { id: "vt-izu", callsign: "IGO214", airline: "IndiGo", sector: "Hyderabad", aircraft_type: "A320neo", phase: "Approaching", speed_kts: 165, altitude_ft: 2400, vertical_rate: -850, heading: 270, squawk: "4512", anomaly_status: "CRITICAL", anomaly_rating: "GPS SPOOF DETECTED", diagnostic_reasoning: "High positional variance between ADS-B coordinates and ground radar.", plain_english: "⚠️ GPS Signal Interference! Conflicting navigation coordinates detected on approach.", lat: 17.3100, lng: 78.6200 },
  { id: "vt-del1", callsign: "AIC102", airline: "Air India", sector: "Delhi NCR", aircraft_type: "B777-300ER", phase: "Climb", speed_kts: 310, altitude_ft: 14200, vertical_rate: 2400, heading: 315, squawk: "1420", anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", diagnostic_reasoning: "Nominal international departure climb out of IGI Delhi (VIDP).", plain_english: "Climbing steadily out of New Delhi on an international corridor.", lat: 28.6200, lng: 77.0500 },
  { id: "vt-bom1", callsign: "AKJ1142", airline: "Akasa Air", sector: "Mumbai", aircraft_type: "B737 MAX", phase: "Cruise", speed_kts: 450, altitude_ft: 33000, vertical_rate: 0, heading: 135, squawk: "3104", anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", diagnostic_reasoning: "Standard cruise vector along Mumbai-Bengaluru airway.", plain_english: "Cruising smoothly southeast over Maharashtra.", lat: 19.1200, lng: 73.1500 },
  { id: "vt-blr1", callsign: "IGO6512", airline: "IndiGo", sector: "Bengaluru", aircraft_type: "A321neo", phase: "Descent", speed_kts: 290, altitude_ft: 11500, vertical_rate: -1400, heading: 195, squawk: "2218", anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", diagnostic_reasoning: "Controlled descent profile into Kempegowda Intl (VOBL).", plain_english: "Descending smoothly for arrival into Bengaluru.", lat: 13.4500, lng: 77.7500 },
  { id: "vt-ccu1", callsign: "SEJ829", airline: "SpiceJet", sector: "Kolkata", aircraft_type: "B737-800", phase: "Descent", speed_kts: 395, altitude_ft: 17200, vertical_rate: -3200, heading: 240, squawk: "7700", anomaly_status: "CRITICAL", anomaly_rating: "RAPID DESCENT WARNING", diagnostic_reasoning: "Vertical descent rate exceeds 3,000 ft/min with emergency squawk 7700.", plain_english: "🚨 Sudden Altitude Drop! Rapid descent detected southwest of Kolkata.", lat: 22.4500, lng: 88.1200 },
  { id: "vt-maa1", callsign: "VTI541", airline: "Vistara", sector: "Chennai", aircraft_type: "A320neo", phase: "Cruise", speed_kts: 440, altitude_ft: 31000, vertical_rate: 0, heading: 10, squawk: "4012", anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", diagnostic_reasoning: "Nominal coastal airway transit north of Chennai.", plain_english: "Cruising northward along the Bay of Bengal coast.", lat: 13.3500, lng: 80.2200 },
  { id: "vt-amd1", callsign: "IGO904", airline: "IndiGo", sector: "Ahmedabad", aircraft_type: "A320neo", phase: "Cruise", speed_kts: 460, altitude_ft: 36000, vertical_rate: 0, heading: 60, squawk: "1156", anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", diagnostic_reasoning: "All Flight DNA vectors nominal over Gujarat.", plain_english: "Cruising smoothly northeast across Gujarat.", lat: 23.1500, lng: 72.8000 },
];

const SECTOR_PRESETS = [
  { label: 'All India', center: [22.0, 79.0], zoom: 5 },
  { label: 'Hyderabad', center: [17.385, 78.4867], zoom: 8 },
  { label: 'Delhi NCR', center: [28.556, 77.100], zoom: 8 },
  { label: 'Mumbai', center: [19.089, 72.865], zoom: 8 },
  { label: 'Bengaluru', center: [13.198, 77.706], zoom: 8 },
];

export default function App() {
  const [flights, setFlights] = useState(DEFAULT_INDIA_FLEET);
  const [selectedFlightId, setSelectedFlightId] = useState("vt-alk");
  const [feedSource, setFeedSource] = useState("Syncing All-India Radar...");
  const [isLive, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetView, setTargetView] = useState(SECTOR_PRESETS[0]);

  const RENDER_BACKEND_URL = 'https://aeroflow-flight-radar.onrender.com';

  // Fetch real-time operational flights across India
  const fetchAllIndiaFlights = async () => {
    try {
      const response = await fetch(`${RENDER_BACKEND_URL}/api/live-flights`);
      if (response.ok) {
        const data = await response.json();
        if (data.flights && data.flights.length > 0) {
          setFlights((prev) => {
            const overrides = {};
            prev.forEach((pf) => {
              if (pf.manualOverride) overrides[pf.id] = pf;
            });
            return data.flights.map((f) =>
              overrides[f.id] ? { ...f, ...overrides[f.id], lat: f.lat, lng: f.lng } : f
            );
          });
          setFeedSource(data.source || 'All-India Live Radar');
          setIsLive(data.status === 'live');
        }
      }
    } catch (err) {
      setFeedSource('All-India Active Telemetry');
    }
  };

  useEffect(() => {
    fetchAllIndiaFlights();
    const apiInterval = setInterval(fetchAllIndiaFlights, 10000); // Sync live backend every 10s
    return () => clearInterval(apiInterval);
  }, []);

  // Real-time 1-second kinematics movement loop (updates lat/lng using speed & heading)
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setFlights((prev) =>
        prev.map((f) => {
          if (f.phase === 'On Ground' || f.speed_kts <= 0) return f;
          const rad = (f.heading * Math.PI) / 180;
          // 1 knot ≈ 0.00000463 degrees per second
          const distanceDeg = f.speed_kts * 0.00000463;
          const nextLat = f.lat + Math.cos(rad) * distanceDeg;
          const nextLng = f.lng + (Math.sin(rad) * distanceDeg) / Math.cos((f.lat * Math.PI) / 180);

          // Keep simulated flights inside Indian airspace boundaries
          const boundedLat = nextLat > 35.5 ? 8.5 : nextLat < 8.0 ? 34.0 : nextLat;
          const boundedLng = nextLng > 95.0 ? 69.5 : nextLng < 69.0 ? 94.0 : nextLng;

          return {
            ...f,
            lat: boundedLat,
            lng: boundedLng,
          };
        })
      );
    }, 1000);

    return () => clearInterval(moveInterval);
  }, []);

  const activeFlight = flights.find((f) => f.id === selectedFlightId) || flights[0];

  const triggerAnomaly = (type) => {
    setFlights((prev) =>
      prev.map((f) => {
        if (f.id !== activeFlight.id) return f;
        if (type === 'GPS_SPOOF') {
          return {
            ...f,
            manualOverride: true,
            anomaly_status: 'CRITICAL',
            anomaly_rating: 'GPS SPOOF DETECTED',
            diagnostic_reasoning: 'ADS-B coordinates drifted 4.2 NM from ground multilateration radar fix.',
            plain_english: '⚠️ GPS Signal Interference! The aircraft is broadcasting manipulated or jammed location coordinates.',
          };
        } else if (type === 'ALTITUDE_DROP') {
          return {
            ...f,
            manualOverride: true,
            vertical_rate: -3400,
            squawk: '7700',
            anomaly_status: 'CRITICAL',
            anomaly_rating: 'RAPID DESCENT WARNING',
            diagnostic_reasoning: 'Uncommanded vertical descent rate (-3,400 ft/min) with emergency squawk 7700.',
            plain_english: '🚨 Sudden Height Drop! The plane is losing altitude rapidly without standard ATC descent clearance.',
          };
        } else {
          return {
            ...f,
            manualOverride: false,
            vertical_rate: 0,
            squawk: '2411',
            anomaly_status: 'NORMAL',
            anomaly_rating: 'NOMINAL',
            diagnostic_reasoning: 'All Flight DNA telemetry vectors restored within safe operating bounds.',
            plain_english: 'Everything is running smoothly. The flight is operating safely within normal parameters.',
          };
        }
      })
    );
  };

  const criticalCount = flights.filter((f) => f.anomaly_status === 'CRITICAL').length;
  const filteredFlights = flights.filter(
    (f) =>
      f.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.sector && f.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0b1020] text-[#e9eef6] p-4 md:p-6 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-wider text-white">AEROFLOW</h1>
            <span className="bg-[#c9a46a]/20 text-[#c9a46a] border border-[#c9a46a]/40 text-xs px-2.5 py-0.5 rounded font-mono font-bold">
              INDIA NATIONAL AIRSPACE COMMAND
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pan-India Real-Time ADS-B Flight Tracking, Kinematics & Explainable AI (XAI) Diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
          {feedSource} ({flights.length} Flights)
        </div>
      </header>

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active India Flights</p>
          <p className="text-2xl font-mono font-bold text-white mt-1">{flights.length}</p>
        </div>
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Anomalies</p>
          <p className={`text-2xl font-mono font-bold mt-1 ${criticalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {criticalCount}
          </p>
        </div>
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Airspace Coverage</p>
          <p className="text-lg font-mono font-bold text-[#c9a46a] mt-1">India FIR (Pan-India)</p>
        </div>
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Kinematics Tracking</p>
          <p className="text-lg font-mono font-bold text-sky-400 mt-1">1.0s Live Motion</p>
        </div>
      </div>

      {/* Main Radar & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map */}
        <div className="lg:col-span-7 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-[580px]">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {SECTOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setTargetView({ ...preset })}
                  className="px-2.5 py-1 bg-[#0b1020] hover:bg-[#1c2a44] text-slate-300 border border-slate-700 rounded text-[11px] font-semibold transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Selected</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Anomaly</span>
            </div>
          </div>

          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-700 z-0">
            <MapContainer center={[22.0, 79.0]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <MapCameraController targetView={targetView} />
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {flights.map((flight) => (
                <Marker
                  key={flight.id}
                  position={[flight.lat, flight.lng]}
                  icon={createPlaneIcon(flight.heading, flight.anomaly_status === 'CRITICAL', flight.id === activeFlight.id)}
                  eventHandlers={{ click: () => setSelectedFlightId(flight.id) }}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans min-w-[150px]">
                      <p className="font-bold text-sm">{flight.callsign}</p>
                      <p className="text-xs text-slate-600">{flight.aircraft_type}</p>
                      <hr className="my-1" />
                      <p className="text-xs">Lat/Lng: <b>{flight.lat.toFixed(3)}, {flight.lng.toFixed(3)}</b></p>
                      <p className="text-xs">Alt: <b>{flight.altitude_ft.toLocaleString()} ft</b></p>
                      <p className="text-xs">Speed: <b>{flight.speed_kts} kts</b></p>
                      <button
                        onClick={() => setSelectedFlightId(flight.id)}
                        className="mt-2 text-xs bg-slate-900 text-white px-2 py-1 rounded w-full font-semibold"
                      >
                        Inspect Flight DNA
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Inspector & XAI Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#1c2a44]/80 border border-slate-700/70 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Selected Flight DNA Profile</span>
                <div className="text-3xl font-mono font-extrabold text-[#c9a46a] mt-0.5">{activeFlight.callsign}</div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-700/60">
                {activeFlight.phase}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300 mt-3 pt-3 border-t border-slate-700/60">
              <span>Sector: <b className="text-white">{activeFlight.sector || 'India FIR'}</b></span>
              <span>Squawk: <b className="font-mono text-amber-300">{activeFlight.squawk}</b></span>
              <span>Coords: <b className="font-mono text-sky-300">{activeFlight.lat.toFixed(2)}°N, {activeFlight.lng.toFixed(2)}°E</b></span>
            </div>
          </div>

          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg grid grid-cols-3 gap-3">
            <div className="bg-[#0b1020]/70 p-3 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400">Groundspeed</p>
              <p className="text-lg font-mono font-bold text-amber-400 mt-0.5">{activeFlight.speed_kts} <span className="text-[11px] text-slate-400">kts</span></p>
            </div>
            <div className="bg-[#0b1020]/70 p-3 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400">Altitude</p>
              <p className="text-lg font-mono font-bold text-cyan-400 mt-0.5">{activeFlight.altitude_ft.toLocaleString()} <span className="text-[11px] text-slate-400">ft</span></p>
            </div>
            <div className="bg-[#0b1020]/70 p-3 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400">Heading / V-Rate</p>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
                {activeFlight.heading}° • {activeFlight.vertical_rate > 0 ? `+${activeFlight.vertical_rate}` : activeFlight.vertical_rate} fpm
              </p>
            </div>
          </div>

          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Explainable AI (XAI) Diagnostics</h2>
              <div className={`p-3 rounded-lg text-center font-bold text-xs tracking-wide ${activeFlight.anomaly_status === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse shadow-lg' : 'bg-emerald-600 text-white'}`}>
                {activeFlight.anomaly_status === 'CRITICAL' ? `CRITICAL: ${activeFlight.anomaly_rating}` : 'STATUS: NOMINAL FLIGHT DNA'}
              </div>
              <div className="mt-3 bg-[#0b1020]/80 border border-slate-800 p-2.5 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Technical Analysis</p>
                <p className="text-xs text-slate-300 font-mono mt-1">{activeFlight.diagnostic_reasoning}</p>
              </div>
            </div>
            <div className="mt-3 bg-indigo-950/50 border border-indigo-500/40 p-3 rounded-lg">
              <p className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold mb-1">💡 What This Means in Plain English</p>
              <p className="text-xs text-slate-100 leading-relaxed">{activeFlight.plain_english}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Controls */}
      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Interactive Anomaly Simulator (Target: <span className="text-[#c9a46a] font-mono">{activeFlight.callsign}</span>)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Inject live telemetry anomalies and observe real-time XAI classification.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => triggerAnomaly('GPS_SPOOF')} className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/35 text-red-400 border border-red-500/40 rounded-lg text-xs font-semibold">
            Inject GPS Spoofing
          </button>
          <button onClick={() => triggerAnomaly('ALTITUDE_DROP')} className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/35 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-semibold">
            Inject Rapid Descent
          </button>
          <button onClick={() => triggerAnomaly('RESET')} className="px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-semibold">
            Reset Flight DNA
          </button>
        </div>
      </div>

      {/* Monitor Table */}
      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Pan-India Airspace Telemetry & Live Coordinates</h2>
          <input
            type="text"
            placeholder="Filter callsign, aircraft, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0b1020] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a46a]"
          />
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b1020] text-slate-400 uppercase font-semibold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-3">Callsign</th>
                <th className="p-3">Sector</th>
                <th className="p-3">Aircraft</th>
                <th className="p-3">Live Coordinates</th>
                <th className="p-3">Altitude / Speed</th>
                <th className="p-3">Flight DNA Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFlights.map((flight) => (
                <tr
                  key={flight.id}
                  onClick={() => setSelectedFlightId(flight.id)}
                  className={`hover:bg-slate-800/50 transition cursor-pointer ${flight.id === activeFlight.id ? 'bg-[#1c2a44]/80' : ''}`}
                >
                  <td className="p-3 font-mono font-bold text-[#c9a46a]">{flight.callsign}</td>
                  <td className="p-3 text-slate-300">{flight.sector || 'India FIR'}</td>
                  <td className="p-3">{flight.aircraft_type}</td>
                  <td className="p-3 font-mono text-sky-300">{flight.lat.toFixed(3)}°N, {flight.lng.toFixed(3)}°E</td>
                  <td className="p-3 font-mono">{flight.altitude_ft.toLocaleString()} ft • {flight.speed_kts} kts</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded font-bold text-[10px] ${flight.anomaly_status === 'CRITICAL' ? 'bg-red-600/30 text-red-400 border border-red-500/50' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'}`}>
                      {flight.anomaly_status}: {flight.anomaly_rating}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFlightId(flight.id);
                        setTargetView({ center: [flight.lat, flight.lng], zoom: 8 });
                      }}
                      className="text-xs text-[#c9a46a] font-semibold hover:underline"
                    >
                      Track
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}