import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom directional SVG airplane icon rotated by live heading
const createPlaneIcon = (heading = 0, isCritical = false, isSelected = false) => {
  const color = isCritical ? '#ef4444' : isSelected ? '#f59e0b' : '#38bdf8';
  const glow = isCritical
    ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.9))'
    : isSelected
    ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))';

  const svg = `
    <div style="transform: rotate(${heading}deg); filter: ${glow}; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="${color}" stroke="#0b1020" stroke-width="1.2">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-plane-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export default function App() {
  const [flights, setFlights] = useState([]);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [feedSource, setFeedSource] = useState('Connecting...');
  const [isLive, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const RENDER_BACKEND_URL = 'https://aeroflow-flight-radar.onrender.com';

  const fetchLiveFlights = async () => {
    try {
      const response = await fetch(`${RENDER_BACKEND_URL}/api/live-flights`);
      if (response.ok) {
        const data = await response.json();
        if (data.flights && data.flights.length > 0) {
          setFlights((prevFlights) => {
            // Preserve any manually injected anomalies during live refreshes
            const manualOverrides = {};
            prevFlights.forEach((pf) => {
              if (pf.manualOverride) manualOverrides[pf.id] = pf;
            });

            return data.flights.map((f) =>
              manualOverrides[f.id] ? { ...f, ...manualOverrides[f.id], lat: f.lat, lng: f.lng } : f
            );
          });

          setFeedSource(data.source || 'Live Radar');
          setIsLive(data.status === 'live');
          setSelectedFlightId((prevId) => prevId || data.flights[0].id);
        }
      }
    } catch (err) {
      console.error('Telemetry fetch error:', err);
      setFeedSource('Reconnecting to Radar...');
    }
  };

  useEffect(() => {
    fetchLiveFlights();
    const interval = setInterval(fetchLiveFlights, 8000); // Poll live sky every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const activeFlight = flights.find((f) => f.id === selectedFlightId) || flights[0] || {
    id: 'SCAN',
    callsign: 'Scanning Sky...',
    aircraft_type: 'ADS-B Receiver',
    phase: 'Standby',
    speed_kts: 0,
    altitude_ft: 0,
    vertical_rate: 0,
    heading: 0,
    squawk: '----',
    anomaly_status: 'NORMAL',
    anomaly_rating: 'NOMINAL',
    diagnostic_reasoning: 'Awaiting telemetry packets from Telangana airspace...',
    plain_english: 'Scanning the skies above Hyderabad and Telangana for active aircraft...',
    lat: 17.385,
    lng: 78.4867,
  };

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
      f.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b1020] text-[#e9eef6] p-4 md:p-6 font-sans">
      {/* Top Command Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-wider text-white">
              AEROFLOW
            </h1>
            <span className="bg-[#c9a46a]/20 text-[#c9a46a] border border-[#c9a46a]/40 text-xs px-2.5 py-0.5 rounded font-mono font-bold">
              TELANGANA AIRSPACE COMMAND
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time ADS-B Flight DNA & Explainable AI (XAI) Anomaly Detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border ${
              isLive
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            {feedSource}
          </span>
        </div>
      </header>

      {/* Top KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Tracked Aircraft</p>
          <p className="text-2xl font-mono font-bold text-white mt-1">{flights.length}</p>
        </div>
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Anomalies</p>
          <p className={`text-2xl font-mono font-bold mt-1 ${criticalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {criticalCount}
          </p>
        </div>
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Sector Coverage</p>
          <p className="text-lg font-mono font-bold text-[#c9a46a] mt-1">VOHY / Telangana</p>
        </div>
        <div className="bg-[#1c2a44]/60 border border-slate-700/60 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Radar Refresh</p>
          <p className="text-lg font-mono font-bold text-sky-400 mt-1">8.0 sec Live</p>
        </div>
      </div>

      {/* Main Radar Map & Flight DNA Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Radar Map */}
        <div className="lg:col-span-7 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-[560px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Live Tactical Airspace Map (Click any aircraft)
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Selected</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Anomaly</span>
            </div>
          </div>

          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-700/80 z-0">
            <MapContainer center={[17.385, 78.4867]} zoom={8} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {flights.map((flight) => (
                <Marker
                  key={flight.id}
                  position={[flight.lat, flight.lng]}
                  icon={createPlaneIcon(
                    flight.heading,
                    flight.anomaly_status === 'CRITICAL',
                    flight.id === activeFlight.id
                  )}
                  eventHandlers={{ click: () => setSelectedFlightId(flight.id) }}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans min-w-[140px]">
                      <p className="font-bold text-sm">{flight.callsign}</p>
                      <p className="text-xs text-slate-600">{flight.aircraft_type}</p>
                      <hr className="my-1" />
                      <p className="text-xs">Alt: <b>{flight.altitude_ft.toLocaleString()} ft</b></p>
                      <p className="text-xs">Speed: <b>{flight.speed_kts} kts</b></p>
                      <p className="text-xs">Heading: <b>{flight.heading}°</b></p>
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

        {/* Right: Flight DNA Telemetry & XAI Diagnostics */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Callsign & Aircraft Card */}
          <div className="bg-[#1c2a44]/80 border border-slate-700/70 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Selected Flight DNA Profile
                </span>
                <div className="text-3xl font-mono font-extrabold text-[#c9a46a] mt-0.5">
                  {activeFlight.callsign}
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-700/60">
                {activeFlight.phase}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300 mt-3 pt-3 border-t border-slate-700/60">
              <span>Type: <b className="text-white">{activeFlight.aircraft_type}</b></span>
              <span>Squawk: <b className="font-mono text-amber-300">{activeFlight.squawk}</b></span>
              <span>Track: <b className="font-mono text-sky-300">{activeFlight.heading}°</b></span>
            </div>
          </div>

          {/* 3-Column Telemetry Vectors */}
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg grid grid-cols-3 gap-3">
            <div className="bg-[#0b1020]/70 p-3 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400">Groundspeed</p>
              <p className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                {activeFlight.speed_kts} <span className="text-[11px] font-normal text-slate-400">kts</span>
              </p>
            </div>
            <div className="bg-[#0b1020]/70 p-3 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400">Altitude</p>
              <p className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
                {activeFlight.altitude_ft.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">ft</span>
              </p>
            </div>
            <div className="bg-[#0b1020]/70 p-3 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400">Vertical Rate</p>
              <p className={`text-lg font-mono font-bold mt-0.5 ${activeFlight.vertical_rate < -2000 ? 'text-red-400' : 'text-emerald-400'}`}>
                {activeFlight.vertical_rate > 0 ? `+${activeFlight.vertical_rate}` : activeFlight.vertical_rate}{' '}
                <span className="text-[10px] font-normal text-slate-400">fpm</span>
              </p>
            </div>
          </div>

          {/* XAI Diagnostics & Plain English Card */}
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">
                Explainable AI (XAI) Anomaly Diagnostics
              </h2>
              <div
                className={`p-3 rounded-lg text-center font-bold text-xs tracking-wide ${
                  activeFlight.anomaly_status === 'CRITICAL'
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/40'
                    : 'bg-emerald-600/90 text-white'
                }`}
              >
                {activeFlight.anomaly_status === 'CRITICAL'
                  ? `CRITICAL: ${activeFlight.anomaly_rating}`
                  : 'STATUS: NOMINAL FLIGHT DNA'}
              </div>

              <div className="mt-3 bg-[#0b1020]/80 border border-slate-800 p-2.5 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Technical Telemetry Analysis</p>
                <p className="text-xs text-slate-300 font-mono mt-1">{activeFlight.diagnostic_reasoning}</p>
              </div>
            </div>

            <div className="mt-3 bg-indigo-950/50 border border-indigo-500/40 p-3.5 rounded-lg">
              <p className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold mb-1">
                💡 What This Means in Plain English
              </p>
              <p className="text-xs text-slate-100 leading-relaxed">{activeFlight.plain_english}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Simulation Controls */}
      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Interactive Anomaly Simulator (Target: <span className="text-[#c9a46a] font-mono">{activeFlight.callsign}</span>)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Test XAI detection responses on live or simulated aircraft telemetry vectors.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => triggerAnomaly('GPS_SPOOF')}
            className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/35 text-red-400 border border-red-500/40 rounded-lg text-xs font-semibold transition"
          >
            Inject GPS Spoofing
          </button>
          <button
            onClick={() => triggerAnomaly('ALTITUDE_DROP')}
            className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/35 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
          >
            Inject Rapid Descent
          </button>
          <button
            onClick={() => triggerAnomaly('RESET')}
            className="px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-semibold transition"
          >
            Reset Flight DNA
          </button>
        </div>
      </div>

      {/* Full Airspace Monitor Table */}
      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Telangana Live Airspace Telemetry & Anomaly Board
          </h2>
          <input
            type="text"
            placeholder="Filter callsign or aircraft..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0b1020] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a46a]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b1020] text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Callsign</th>
                <th className="p-3">Aircraft</th>
                <th className="p-3">Phase</th>
                <th className="p-3">Altitude</th>
                <th className="p-3">Speed / Track</th>
                <th className="p-3">Flight DNA Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFlights.map((flight) => (
                <tr
                  key={flight.id}
                  onClick={() => setSelectedFlightId(flight.id)}
                  className={`hover:bg-slate-800/50 transition cursor-pointer ${
                    flight.id === activeFlight.id ? 'bg-[#1c2a44]/80' : ''
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-[#c9a46a]">{flight.callsign}</td>
                  <td className="p-3">{flight.aircraft_type}</td>
                  <td className="p-3 font-medium text-sky-400">{flight.phase}</td>
                  <td className="p-3 font-mono">{flight.altitude_ft.toLocaleString()} ft</td>
                  <td className="p-3 font-mono">
                    {flight.speed_kts} kts • {flight.heading}°
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded font-bold text-[10px] ${
                        flight.anomaly_status === 'CRITICAL'
                          ? 'bg-red-600/30 text-red-400 border border-red-500/50'
                          : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {flight.anomaly_status}: {flight.anomaly_rating}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFlightId(flight.id);
                      }}
                      className="text-xs text-[#c9a46a] font-semibold hover:underline"
                    >
                      Inspect
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