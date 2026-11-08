import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function App() {
  const [flights, setFlights] = useState([
    {
      id: "AI-784",
      callsign: "Air India AI-784",
      aircraft_type: "Boeing 737-800",
      phase: "Approaching",
      speed_kts: 450,
      altitude_ft: 32000,
      vertical_rate: 0,
      anomaly_status: "NORMAL",
      anomaly_rating: "NOMINAL",
      shield_status: "Active",
      diagnostic_reasoning: "All parameters are within normal cruise operating envelopes.",
      plain_english: "Everything is running smoothly! The flight is cruising safely with normal speed, altitude, and direction.",
      lat: 17.3850,
      lng: 78.4867,
      dLat: 0.0008,
      dLng: 0.0005
    },
    {
      id: "6E-214",
      callsign: "IndiGo 6E-214",
      aircraft_type: "Airbus A320neo",
      phase: "Landing",
      speed_kts: 140,
      altitude_ft: 1200,
      vertical_rate: -700,
      anomaly_status: "CRITICAL",
      anomaly_rating: "GPS SPOOF DETECTED",
      shield_status: "Engaged",
      diagnostic_reasoning: "Telemetry deviation detected: High positional variance against radar trajectory.",
      plain_english: "⚠️ GPS Signal Interference! The airplane's navigation system is receiving fake or jammed location signals.",
      lat: 17.4500,
      lng: 78.3800,
      dLat: -0.0005,
      dLng: 0.0007
    },
    {
      id: "UK-881",
      callsign: "Vistara UK-881",
      aircraft_type: "Airbus A321neo",
      phase: "Takeoff",
      speed_kts: 210,
      altitude_ft: 3500,
      vertical_rate: +1800,
      anomaly_status: "NORMAL",
      anomaly_rating: "NOMINAL",
      shield_status: "Active",
      diagnostic_reasoning: "Nominal climb gradient maintained without trajectory conflict.",
      plain_english: "Everything is working correctly. The aircraft is taking off smoothly on its assigned climbing path.",
      lat: 17.2400,
      lng: 78.4290,
      dLat: 0.0006,
      dLng: -0.0006
    },
    {
      id: "SG-342",
      callsign: "SpiceJet SG-342",
      aircraft_type: "Boeing 737-MAX",
      phase: "Cruise",
      speed_kts: 420,
      altitude_ft: 18000,
      vertical_rate: -2500,
      anomaly_status: "CRITICAL",
      anomaly_rating: "RAPID DESCENT WARNING",
      shield_status: "Shield Alert",
      diagnostic_reasoning: "Unscheduled vertical rate surge detected without ATC descent clearance.",
      plain_english: "🚨 Sudden Height Drop! The plane is losing altitude much faster than normal without permission.",
      lat: 17.5200,
      lng: 78.5800,
      dLat: -0.0007,
      dLng: -0.0004
    }
  ]);

  const [selectedFlightId, setSelectedFlightId] = useState("AI-784");
  const [isConnected, setIsConnected] = useState(false);

  const activeFlight = flights.find(f => f.id === selectedFlightId) || flights[0];
  const RENDER_BACKEND_URL = 'https://aeroflow-flight-radar.onrender.com';

  // Live Position Movement Loop (Updates plane coordinates every 1.5 seconds)
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setFlights(prevFlights =>
        prevFlights.map(f => ({
          ...f,
          lat: f.lat + f.dLat,
          lng: f.lng + f.dLng,
          // Slightly fluctuate speed and altitude for realism
          speed_kts: f.speed_kts + Math.floor(Math.random() * 3 - 1)
        }))
      );
    }, 1500);

    return () => clearInterval(moveInterval);
  }, []);

  const fetchBackendTelemetry = async () => {
    try {
      const response = await fetch(`${RENDER_BACKEND_URL}/api/telemetry`);
      if (response.ok) {
        setIsConnected(true);
      }
    } catch (err) {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchBackendTelemetry();
    const interval = setInterval(fetchBackendTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerAnomaly = (type) => {
    setFlights(prev =>
      prev.map(f => {
        if (f.id === selectedFlightId) {
          if (type === 'GPS_SPOOF') {
            return {
              ...f,
              anomaly_status: "CRITICAL",
              anomaly_rating: "GPS SPOOF DETECTED",
              shield_status: "Engaged",
              diagnostic_reasoning: "Telemetry deviation detected: High positional variance against radar trajectory.",
              plain_english: "⚠️ GPS Signal Interference! The airplane's navigation system is receiving fake or jammed location signals."
            };
          } else if (type === 'ALTITUDE_DROP') {
            return {
              ...f,
              altitude_ft: 14000,
              vertical_rate: -3200,
              anomaly_status: "CRITICAL",
              anomaly_rating: "RAPID DESCENT WARNING",
              shield_status: "Shield Alert",
              diagnostic_reasoning: "Unscheduled vertical rate surge detected without ATC descent clearance.",
              plain_english: "🚨 Sudden Height Drop! The plane is plunging downward much faster than expected."
            };
          } else {
            return {
              ...f,
              altitude_ft: 32000,
              speed_kts: 450,
              vertical_rate: 0,
              anomaly_status: "NORMAL",
              anomaly_rating: "NOMINAL",
              shield_status: "Active",
              diagnostic_reasoning: "All parameters are within normal cruise operating envelopes.",
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
          AEROFLOW <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded ml-2 font-mono font-bold">LIVE RADAR</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Status:</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {isConnected ? 'FastAPI Connected' : 'Simulated Telemetry Mode'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tactical Flight Map (Real-time trajectory tracking)</h2>
            <span className="text-amber-400 font-mono text-xs">Active Trackers: {flights.length}</span>
          </div>
          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-700">
            <MapContainer center={[17.3850, 78.4867]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {flights.map((flight) => (
                <Marker
                  key={flight.id}
                  position={[flight.lat, flight.lng]}
                  eventHandlers={{
                    click: () => setSelectedFlightId(flight.id)
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans">
                      <p className="font-bold">{flight.callsign}</p>
                      <p className="text-xs">Phase: {flight.phase}</p>
                      <p className="text-xs">Status: <b className={flight.anomaly_status === 'CRITICAL' ? 'text-red-600' : 'text-green-600'}>{flight.anomaly_status}</b></p>
                      <button
                        onClick={() => setSelectedFlightId(flight.id)}
                        className="mt-2 text-xs bg-slate-800 text-white px-2 py-1 rounded w-full"
                      >
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
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Inspector</h2>
                <div className="text-2xl font-mono font-bold text-amber-400">{activeFlight.callsign}</div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-800/50">
                {activeFlight.phase}
              </span>
            </div>
            <p className="text-xs text-slate-400">Aircraft: <span className="text-slate-200 font-medium">{activeFlight.aircraft_type}</span></p>
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
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeFlight.plain_english}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">
          Anomaly Injection Controls (Target: <span className="text-amber-400">{activeFlight.id}</span>)
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerAnomaly('GPS_SPOOF')}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 rounded text-xs font-semibold transition"
          >
            Inject GPS Spoofing Anomaly
          </button>
          <button
            onClick={() => triggerAnomaly('ALTITUDE_DROP')}
            className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/40 rounded text-xs font-semibold transition"
          >
            Inject Altitude Drop Anomaly
          </button>
          <button
            onClick={() => triggerAnomaly('RESET')}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs font-semibold transition"
          >
            Reset Flight Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}