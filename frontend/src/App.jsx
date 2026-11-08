import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function App() {
  const [flights, setFlights] = useState([]);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const RENDER_BACKEND_URL = 'https://aeroflow-flight-radar.onrender.com';

  const fetchLiveAirspace = async () => {
    try {
      const response = await fetch(`${RENDER_BACKEND_URL}/api/live-flights`);
      if (response.ok) {
        const result = await response.json();
        if (result.flights && result.flights.length > 0) {
          setFlights(result.flights);
          if (!selectedFlightId && result.flights[0]) {
            setSelectedFlightId(result.flights[0].id);
          }
          setIsConnected(true);
        }
      }
    } catch (err) {
      console.error("Live OpenSky stream unreachable", err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchLiveAirspace();
    const interval = setInterval(fetchLiveAirspace, 10000); // Poll live air traffic every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const activeFlight = flights.find(f => f.id === selectedFlightId) || flights[0] || {
    callsign: "Searching Airspace...",
    aircraft_type: "Scanning...",
    phase: "N/A",
    speed_kts: 0,
    altitude_ft: 0,
    anomaly_status: "NORMAL",
    anomaly_rating: "NOMINAL",
    diagnostic_reasoning: "Scanning Telangana airspace for live ADS-B flight feeds...",
    plain_english: "Waiting for live air traffic data from OpenSky Network..."
  };

  const triggerAnomaly = (type) => {
    setFlights(prev =>
      prev.map(f => {
        if (f.id === activeFlight.id) {
          if (type === 'GPS_SPOOF') {
            return {
              ...f,
              anomaly_status: "CRITICAL",
              anomaly_rating: "GPS SPOOF DETECTED",
              shield_status: "Engaged",
              diagnostic_reasoning: "Telemetry deviation detected: Positional shift flagged on live ADS-B radar.",
              plain_english: "⚠️ GPS Signal Interference! The aircraft's reported location is drifting away from ground radar tracking."
            };
          } else if (type === 'ALTITUDE_DROP') {
            return {
              ...f,
              altitude_ft: Math.max(1000, f.altitude_ft - 10000),
              vertical_rate: -3200,
              anomaly_status: "CRITICAL",
              anomaly_rating: "RAPID DESCENT WARNING",
              shield_status: "Shield Alert",
              diagnostic_reasoning: "Unscheduled vertical rate surge detected on live flight path.",
              plain_english: "🚨 Sudden Height Drop! The plane lost altitude abruptly without clearance."
            };
          } else {
            return {
              ...f,
              anomaly_status: "NORMAL",
              anomaly_rating: "NOMINAL",
              shield_status: "Active",
              diagnostic_reasoning: "Live telemetry verified against OpenSky ADS-B network stream.",
              plain_english: "Everything is running smoothly! The flight is operating safely within normal parameters."
            };
          }
        }
        return f;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-[#e9eef6] p-6 font-sans">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-wider text-white">
          AEROFLOW <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded ml-2 font-mono font-bold">TELANGANA LIVE RADAR</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Live Airspace Feed:</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {isConnected ? `OpenSky Network Live (${flights.length} Active Flights)` : 'Connecting to OpenSky API...'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Telangana Real-time Flight Map</h2>
            <span className="text-amber-400 font-mono text-xs">Live Airspace Count: {flights.length}</span>
          </div>
          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-700">
            <MapContainer center={[17.3850, 78.4867]} zoom={8} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {flights.map((flight) => (
                <Marker
                  key={flight.id}
                  position={[flight.lat, flight.lng]}
                  eventHandlers={{ click: () => setSelectedFlightId(flight.id) }}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans">
                      <p className="font-bold">{flight.callsign}</p>
                      <p className="text-xs">Phase: {flight.phase}</p>
                      <p className="text-xs">Alt: {flight.altitude_ft} ft | Speed: {flight.speed_kts} kts</p>
                      <button onClick={() => setSelectedFlightId(flight.id)} className="mt-2 text-xs bg-slate-800 text-white px-2 py-1 rounded w-full">
                        Inspect Telemetry
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Active Flight Inspector</h2>
            <div className="text-2xl font-mono font-bold text-amber-400">{activeFlight.callsign}</div>
            <p className="text-xs text-slate-400 mt-1">Flight Phase: <span className="text-sky-400 font-semibold">{activeFlight.phase}</span></p>
          </div>

          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Airspeed</p>
              <p className="text-xl font-mono font-bold text-yellow-400">{activeFlight.speed_kts} <span className="text-xs font-normal text-slate-400">kts</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Altitude</p>
              <p className="text-xl font-mono font-bold text-cyan-400">{activeFlight.altitude_ft} <span className="text-xs font-normal text-slate-400">ft</span></p>
            </div>
          </div>

          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">XAI Anomaly Diagnostics</h2>
            <div className={`p-2.5 rounded-lg text-center font-bold text-xs tracking-wide transition-all ${activeFlight.anomaly_status === 'CRITICAL' ? 'bg-red-600/90 text-white animate-pulse' : 'bg-emerald-600/90 text-white'}`}>
              {activeFlight.anomaly_status === 'CRITICAL' ? `CRITICAL: ${activeFlight.anomaly_rating}` : 'NORMAL: NOMINAL'}
            </div>
            <div className="mt-3 bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-lg">
              <p className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold mb-1">💡 What This Means in Plain English</p>
              <p className="text-xs text-slate-200 leading-relaxed">{activeFlight.plain_english}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">
          Anomaly Injection Controls (Target: <span className="text-amber-400">{activeFlight.callsign}</span>)
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => triggerAnomaly('GPS_SPOOF')} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 rounded text-xs font-semibold">
            Inject GPS Spoofing Anomaly
          </button>
          <button onClick={() => triggerAnomaly('ALTITUDE_DROP')} className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/40 rounded text-xs font-semibold">
            Inject Altitude Drop Anomaly
          </button>
          <button onClick={() => triggerAnomaly('RESET')} className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs font-semibold">
            Reset Flight Telemetry
          </button>
        </div>
      </div>

      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-4 font-semibold">Telangana Real-time Airspace Monitor & Anomaly Board</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b1020] text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Callsign / ICAO</th>
                <th className="p-3">Flight Phase</th>
                <th className="p-3">Altitude / Speed</th>
                <th className="p-3">Anomaly State</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {flights.map((flight) => (
                <tr key={flight.id} className={`hover:bg-slate-800/40 transition cursor-pointer ${flight.id === activeFlight.id ? 'bg-slate-800/60' : ''}`} onClick={() => setSelectedFlightId(flight.id)}>
                  <td className="p-3 font-mono font-bold text-amber-400">{flight.callsign}</td>
                  <td className="p-3 font-medium text-sky-400">{flight.phase}</td>
                  <td className="p-3 font-mono">{flight.altitude_ft} ft | {flight.speed_kts} kts</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded font-bold text-[10px] ${flight.anomaly_status === 'CRITICAL' ? 'bg-red-600/30 text-red-400 border border-red-500/50' : 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50'}`}>
                      {flight.anomaly_status}: {flight.anomaly_rating}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFlightId(flight.id); }} className="text-xs text-amber-400 underline hover:text-amber-300">
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