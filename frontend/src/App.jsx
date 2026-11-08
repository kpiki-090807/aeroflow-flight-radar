import React, { useState, useEffect } from 'react';

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
    diagnostic_reasoning: "All parameters are within normal cruise operating envelopes."
  });
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
      console.error("Backend offline or polling fallback active", err);
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
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-white">
            AEROFLOW <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded ml-2 font-mono">WAR ROOM</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Status:</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {isConnected ? 'FastAPI Connected' : 'Simulated Telemetry Mode'}
          </span>
        </div>
      </header>

      {/* Primary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Flight Details */}
        <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-4 font-semibold">Flight Identification</h2>
          <div className="text-3xl font-mono font-bold text-amber-400 mb-2">
            {telemetry.flight_id}
          </div>
          <div className="space-y-2 text-sm text-slate-300">
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

        {/* Card 2: Live Telemetry */}
        <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-4 font-semibold">Live Telemetry Data</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Airspeed</p>
              <p className="text-2xl font-mono font-bold text-yellow-400">{telemetry.speed_kts} <span className="text-xs font-normal text-slate-400">kts</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Altitude</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">{telemetry.altitude_ft} <span className="text-xs font-normal text-slate-400">ft</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Vertical Rate</p>
              <p className="text-xl font-mono text-emerald-400">{telemetry.vertical_rate} <span className="text-xs font-normal text-slate-400">ft/s</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Shield Status</p>
              <p className="text-xl font-mono text-emerald-400">{telemetry.shield_status}</p>
            </div>
          </div>
        </div>

        {/* Card 3: XAI Diagnostic Console */}
        <div className="bg-[#141c2e] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">XAI Diagnostic Console</h2>
            <div className={`p-3 rounded-lg text-center font-bold text-sm tracking-wide transition-all ${telemetry.anomaly_status === 'CRITICAL' ? 'bg-red-600/90 text-white animate-pulse' : 'bg-emerald-600/90 text-white'}`}>
              {telemetry.anomaly_status === 'CRITICAL' ? `CRITICAL: ${telemetry.anomaly_rating}` : 'NORMAL: NOMINAL'}
            </div>
            <p className="text-xs text-slate-300 mt-4 leading-relaxed font-mono bg-[#0b1020] p-3 rounded border border-slate-800">
              {telemetry.diagnostic_reasoning}
            </p>
          </div>
        </div>

      </div>

      {/* Interactive Anomaly Simulator Panel */}
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