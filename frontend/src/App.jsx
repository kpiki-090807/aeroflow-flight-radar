import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function App() {
  const [telemetry, setTelemetry] = useState({
    flight_id: "AI-784",
    aircraft_type: "Boeing 737-800",
    phase: "Approaching",
    speed_kts: 450,
    altitude_ft: 32000,
    vertical_rate: 0,
    anomaly_status: "NORMAL",
    anomaly_rating: "NOMINAL",
    shield_status: "Active",
    diagnostic_reasoning: "All parameters are within normal cruise operating envelopes.",
    lat: 17.3850,
    lng: 78.4867
  });

  const [flights, setFlights] = useState([
    { id: "AI-784", callsign: "AI-784 (Focus)", lat: 17.3850, lng: 78.4867, alt: "32,000 ft", speed: "450 kts", phase: "Approaching" },
    { id: "6E-214", callsign: "IndiGo 6E-214", lat: 17.4500, lng: 78.3800, alt: "12,400 ft", speed: "310 kts", phase: "Landing" },
    { id: "UK-881", callsign: "Vistara UK-881", lat: 17.2400, lng: 78.4290, alt: "1,500 ft", speed: "180 kts", phase: "Takeoff" },
    { id: "SG-342", callsign: "SpiceJet SG-342", lat: 17.5200, lng: 78.5800, alt: "24,000 ft", speed: "410 kts", phase: "Cruise" }
  ]);

  const [isConnected, setIsConnected] = useState(false);
  const RENDER_BACKEND_URL = 'https://aeroflow-flight-radar.onrender.com';

  const fetchTelemetry = async () => {
    try {
      const response = await fetch(`${RENDER_BACKEND_URL}/api/telemetry`);
      if (response.ok) {
        const data = await response.json();
        setTelemetry(prev => ({ ...prev, ...data }));
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Backend offline, using simulated telemetry mode", err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  const triggerAnomaly = (type) => {
    if (type === 'GPS_SPOOF') {
      setTelemetry(prev => ({
        ...prev,
        anomaly_status: "CRITICAL",
        anomaly_rating: "GPS SPOOF DETECTED",
        diagnostic_reasoning: "Telemetry deviation detected: High positional variance against radar trajectory."
      }));
    } else if (type === 'ALTITUDE_DROP') {
      setTelemetry(prev => ({
        ...prev,
        altitude_ft: 18000,
        vertical_rate: -2500,
        anomaly_status: "CRITICAL",
        anomaly_rating: "RAPID DESCENT WARNING",
        diagnostic_reasoning: "Unscheduled vertical rate surge detected without ATC descent clearance."
      }));
    } else {
      setTelemetry(prev => ({
        ...prev,
        altitude_ft: 32000,
        speed_kts: 450,
        vertical_rate: 0,
        anomaly_status: "NORMAL",
        anomaly_rating: "NOMINAL",
        diagnostic_reasoning: "All parameters are within normal cruise operating envelopes."
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-[#e9eef6] p-6 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-wider text-white">
          AEROFLOW <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded ml-2 font-mono">WAR ROOM</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Status:</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {isConnected ? 'FastAPI Connected' : 'Simulated Telemetry Mode'}
          </span>
        </div>
      </header>

      {/* Main Grid: Split Screen (Map on Left, Telemetry/XAI on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Tactical Flight Map (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[500px]">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold flex justify-between items-center">
            <span>Tactical Flight Map (Hyderabad Airspace)</span>
            <span className="text-amber-400 font-mono">Active Trackers: {flights.length}</span>
          </h2>
          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-700">
            <MapContainer center={[17.3850, 78.4867]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {flights.map((flight, idx) => (
                <Marker key={idx} position={[flight.lat, flight.lng]}>
                  <Popup>
                    <div className="text-slate-900 font-sans">
                      <p className="font-bold text-base">{flight.callsign}</p>
                      <p className="text-xs">Phase: <span className="font-semibold">{flight.phase}</span></p>
                      <p className="text-xs">Alt: {flight.alt} | Speed: {flight.speed}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Telemetry & XAI Console (Right 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Flight Identification */}
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Flight Identification</h2>
            <div className="text-2xl font-mono font-bold text-amber-400 mb-1">
              {telemetry.flight_id}
            </div>
            <div className="space-y-1 text-sm text-slate-300">
              <p className="flex justify-between">
                <span className="text-slate-400">Aircraft:</span>
                <span className="font-semibold">{telemetry.aircraft_type}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Flight Phase:</span>
                <span className="font-semibold text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/50">
                  {telemetry.phase}
                </span>
              </p>
            </div>
          </div>

          {/* Live Telemetry Data */}
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">Live Telemetry Data</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Airspeed</p>
                <p className="text-xl font-mono font-bold text-yellow-400">{telemetry.speed_kts} <span className="text-xs font-normal text-slate-400">kts</span></p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Altitude</p>
                <p className="text-xl font-mono font-bold text-cyan-400">{telemetry.altitude_ft} <span className="text-xs font-normal text-slate-400">ft</span></p>
              </div>
            </div>
          </div>

          {/* XAI Diagnostic Console */}
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex-1">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">XAI Diagnostic Console</h2>
            <div className={`p-2.5 rounded-lg text-center font-bold text-xs tracking-wide transition-all ${telemetry.anomaly_status === 'CRITICAL' ? 'bg-red-600/90 text-white animate-pulse' : 'bg-emerald-600/90 text-white'}`}>
              {telemetry.anomaly_status === 'CRITICAL' ? `CRITICAL: ${telemetry.anomaly_rating}` : 'NORMAL: NOMINAL'}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed font-mono bg-[#0b1020] p-2.5 rounded border border-slate-800">
              {telemetry.diagnostic_reasoning}
            </p>
          </div>

        </div>

      </div>

      {/* Interactive Anomaly Injection Controls */}
      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">Interactive Anomaly Injection Controls</h2>
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
            Reset Telemetry to Nominal
          </button>
        </div>
      </div>
    </div>
  );
}