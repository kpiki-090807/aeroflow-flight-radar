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

const INITIAL_FLEET = [
  { id: "AI-784", callsign: "Air India AI-784", aircraft_type: "Boeing 737-800", phase: "Approaching", speed_kts: 450, altitude_ft: 32000, anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", plain_english: "Everything is running smoothly! Cruising safely towards Hyderabad.", lat: 17.3850, lng: 78.4867, dLat: 0.0004, dLng: 0.0003 },
  { id: "6E-214", callsign: "IndiGo 6E-214", aircraft_type: "Airbus A320neo", phase: "Landing", speed_kts: 140, altitude_ft: 1200, anomaly_status: "CRITICAL", anomaly_rating: "GPS SPOOF DETECTED", plain_english: "⚠️ GPS Signal Interference! The aircraft's navigation system is receiving fake or jammed location signals.", lat: 17.4500, lng: 78.3800, dLat: -0.0003, dLng: 0.0005 },
  { id: "UK-881", callsign: "Vistara UK-881", aircraft_type: "Airbus A321neo", phase: "Takeoff", speed_kts: 210, altitude_ft: 3500, anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", plain_english: "Aircraft is taking off smoothly on its assigned climbing path.", lat: 17.2400, lng: 78.4290, dLat: 0.0005, dLng: -0.0004 },
  { id: "SG-342", callsign: "SpiceJet SG-342", aircraft_type: "Boeing 737-MAX", phase: "Cruise", speed_kts: 420, altitude_ft: 18000, anomaly_status: "CRITICAL", anomaly_rating: "RAPID DESCENT WARNING", plain_english: "🚨 Sudden Height Drop! The plane is losing altitude much faster than normal without permission.", lat: 17.5200, lng: 78.5800, dLat: -0.0004, dLng: -0.0003 },
  { id: "IX-492", callsign: "Air India Express IX-492", aircraft_type: "Boeing 737-800", phase: "Cruise", speed_kts: 460, altitude_ft: 36000, anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", plain_english: "Flight operating normally across Telangana skies.", lat: 17.9689, lng: 79.5941, dLat: 0.0003, dLng: 0.0004 }
];

export default function App() {
  const [flights, setFlights] = useState(INITIAL_FLEET);
  const [selectedFlightId, setSelectedFlightId] = useState("AI-784");

  // Real-time movement simulation loop
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setFlights(prev =>
        prev.map(f => ({
          ...f,
          lat: f.lat + (f.dLat || 0.0002),
          lng: f.lng + (f.dLng || 0.0002),
          speed_kts: f.speed_kts + Math.floor(Math.random() * 3 - 1)
        }))
      );
    }, 1500);
    return () => clearInterval(moveInterval);
  }, []);

  const activeFlight = flights.find(f => f.id === selectedFlightId) || flights[0];

  const triggerAnomaly = (type) => {
    setFlights(prev =>
      prev.map(f => {
        if (f.id === activeFlight.id) {
          if (type === 'GPS_SPOOF') {
            return { ...f, anomaly_status: "CRITICAL", anomaly_rating: "GPS SPOOF DETECTED", plain_english: "⚠️ GPS Signal Interference! The aircraft's navigation system is receiving fake or jammed location signals." };
          } else if (type === 'ALTITUDE_DROP') {
            return { ...f, altitude_ft: Math.max(1200, f.altitude_ft - 12000), anomaly_status: "CRITICAL", anomaly_rating: "RAPID DESCENT WARNING", plain_english: "🚨 Sudden Height Drop! The plane is plunging downward much faster than expected." };
          } else {
            return { ...f, altitude_ft: 32000, speed_kts: 450, anomaly_status: "NORMAL", anomaly_rating: "NOMINAL", plain_english: "Everything is running smoothly! Operating safely within normal parameters." };
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
          AEROFLOW <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded ml-2 font-mono font-bold">TELANGANA WAR ROOM</span>
        </h1>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Telemetry Active ({flights.length} Flights)
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[520px]">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Telangana Tactical Flight Map</h2>
          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-700">
            <MapContainer center={[17.3850, 78.4867]} zoom={9} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {flights.map((flight) => (
                <Marker key={flight.id} position={[flight.lat, flight.lng]} eventHandlers={{ click: () => setSelectedFlightId(flight.id) }}>
                  <Popup>
                    <div className="text-slate-900 font-sans">
                      <p className="font-bold">{flight.callsign}</p>
                      <p className="text-xs">Alt: {flight.altitude_ft} ft | Speed: {flight.speed_kts} kts</p>
                      <button onClick={() => setSelectedFlightId(flight.id)} className="mt-2 text-xs bg-slate-800 text-white px-2 py-1 rounded w-full">Inspect</button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Inspector</h2>
            <div className="text-2xl font-mono font-bold text-amber-400">{activeFlight.callsign}</div>
            <p className="text-xs text-slate-400 mt-1">Phase: <span className="text-sky-400">{activeFlight.phase}</span></p>
          </div>

          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Airspeed</p>
              <p className="text-xl font-mono font-bold text-yellow-400">{activeFlight.speed_kts} <span className="text-xs text-slate-400">kts</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Altitude</p>
              <p className="text-xl font-mono font-bold text-cyan-400">{activeFlight.altitude_ft} <span className="text-xs text-slate-400">ft</span></p>
            </div>
          </div>

          <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-4 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">XAI Anomaly Diagnostics</h2>
            <div className={`p-2.5 rounded-lg text-center font-bold text-xs ${activeFlight.anomaly_status === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
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
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">Anomaly Injection Controls (Target: {activeFlight.callsign})</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => triggerAnomaly('GPS_SPOOF')} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/40 rounded text-xs font-semibold">Inject GPS Spoof</button>
          <button onClick={() => triggerAnomaly('ALTITUDE_DROP')} className="px-4 py-2 bg-amber-600/20 text-amber-400 border border-amber-500/40 rounded text-xs font-semibold">Inject Altitude Drop</button>
          <button onClick={() => triggerAnomaly('RESET')} className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-xs font-semibold">Reset Telemetry</button>
        </div>
      </div>

      <div className="mt-6 bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-4 font-semibold">Telangana Airspace Anomaly Monitor</h2>
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0b1020] text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th className="p-3">Callsign</th>
              <th className="p-3">Aircraft</th>
              <th className="p-3">Phase</th>
              <th className="p-3">Altitude / Speed</th>
              <th className="p-3">Anomaly State</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {flights.map((flight) => (
              <tr key={flight.id} className={`hover:bg-slate-800/40 cursor-pointer ${flight.id === activeFlight.id ? 'bg-slate-800/60' : ''}`} onClick={() => setSelectedFlightId(flight.id)}>
                <td className="p-3 font-mono font-bold text-amber-400">{flight.callsign}</td>
                <td className="p-3">{flight.aircraft_type}</td>
                <td className="p-3 text-sky-400">{flight.phase}</td>
                <td className="p-3 font-mono">{flight.altitude_ft} ft | {flight.speed_kts} kts</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded font-bold text-[10px] ${flight.anomaly_status === 'CRITICAL' ? 'bg-red-600/30 text-red-400' : 'bg-emerald-600/30 text-emerald-400'}`}>
                    {flight.anomaly_status}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFlightId(flight.id); }} className="text-amber-400 underline">Inspect</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}