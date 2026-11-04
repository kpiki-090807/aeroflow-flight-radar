import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Plane, AlertTriangle, ShieldCheck, Activity, Terminal, RefreshCw, Cpu } from 'lucide-react';
import L from 'leaflet';

// Custom plane marker icon
const planeIcon = new L.DivIcon({
  className: 'custom-plane-icon',
  html: `<div style="color: #fbbf24; transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13.5 19v-5.5L21 16z"/></svg>
        </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://aeroflow-flight-radar.onrender.com/api/telemetry');
      if (!response.ok) throw new Error('Failed to fetch from FastAPI backend');
      const data = await response.json();
      setTelemetry(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b1020] text-[#e9eef6]">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-[#0f172a] px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <Plane className="h-7 w-7 text-amber-400" />
          <h1 className="text-xl font-bold tracking-wider text-white">
            AEROFLOW <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">WAR ROOM</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={fetchTelemetry}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Poll Engine</span>
          </button>
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>FastAPI Connected</span>
          </div>
        </div>
      </header>

      {/* Main Cockpit Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        
        {/* Column 1: Tactical Flight Map */}
        <section className="col-span-7 bg-[#1e293b]/60 rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-md">
          <div className="p-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Activity className="h-4 w-4 text-sky-400" />
              <span>Tactical Flight Map</span>
            </span>
            {telemetry && (
              <span className="text-xs font-mono text-amber-400">
                {telemetry.aircraft_id || 'AI-784'}
              </span>
            )}
          </div>

          <div className="flex-1 w-full relative">
            <MapContainer
              center={[17.44, 78.38]}
              zoom={11}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', backgroundColor: '#0b1020' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {telemetry && telemetry.latitude && (
                <Marker position={[telemetry.latitude, telemetry.longitude]} icon={planeIcon}>
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <strong className="block text-slate-900">{telemetry.aircraft_id}</strong>
                      <span className="text-slate-600">Alt: {telemetry.altitude} ft</span>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </section>

        {/* Column 2: Flight Telemetry Metrics */}
        <section className="col-span-2 bg-[#1e293b]/60 rounded-xl border border-slate-800 p-4 flex flex-col justify-between shadow-md">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Cpu className="h-4 w-4 text-amber-400" />
            <span>Telemetry</span>
          </h2>

          <div className="space-y-4 my-auto">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Speed</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {telemetry ? `${telemetry.speed} kts` : '--'}
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Altitude</span>
              <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                {telemetry ? `${telemetry.altitude} ft` : '--'}
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Vertical Rate</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {telemetry ? `${telemetry.vertical_rate} ft/s` : '--'}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800">
            UPDATE RATE: 3.0s
          </div>
        </section>

        {/* Column 3: XAI Diagnostic Console */}
        <section className="col-span-3 bg-[#1e293b]/60 rounded-xl border border-slate-800 p-4 flex flex-col justify-between shadow-md">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span>XAI Diagnostic Console</span>
          </h2>

          <div className="flex-1 my-3 bg-slate-950 rounded-lg p-3 border border-slate-800 overflow-y-auto font-mono text-xs space-y-3">
            {error ? (
              <div className="text-rose-400 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Backend Error: {error}. Ensure FastAPI `main.py` is running on port 8000.</span>
              </div>
            ) : telemetry ? (
              <>
                <div className="flex items-center space-x-2 text-emerald-400 border-b border-slate-800/60 pb-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="font-semibold text-xs">Shield Status: Active</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">DIAGNOSTIC REASONING:</span>
                  <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">
                    {telemetry.explanation || "System nominal. Telemetry parameters adhere strictly to valid flight performance envelope."}
                  </p>
                </div>
              </>
            ) : (
              <span className="text-slate-500 italic">Awaiting backend response...</span>
            )}
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Anomaly Rating:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              telemetry?.is_anomaly ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {telemetry?.is_anomaly ? 'CRITICAL SPIKE' : 'NOMINAL'}
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}