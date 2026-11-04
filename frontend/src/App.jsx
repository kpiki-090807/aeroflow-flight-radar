import React, { useState, useEffect } from 'react';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch('https://aeroflow-flight-radar.onrender.com/api/telemetry');
        const data = await response.json();
        setTelemetry(data);
      } catch (err) {
        console.error("Failed to fetch telemetry", err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-[#0b1020] text-[#e9eef6] min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">AEROFLOW WAR ROOM</h1>
        <div className="text-sm bg-[#1c2a44] px-3 py-1 rounded">
          Status: <span className="text-green-400">FastAPI Connected</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Flight Details & Phase */}
        <div className="bg-[#1c2a44] p-4 rounded-xl">
          <h2 className="text-sm text-slate-400 uppercase mb-2">Flight Identification</h2>
          <p className="text-2xl font-mono text-amber-400">{telemetry?.flight_id || "Loading..."}</p>
          <p className="text-sm text-slate-300 mt-1">Phase: <span className="font-semibold text-blue-400">{telemetry?.phase}</span></p>
        </div>

        {/* Telemetry Panel */}
        <div className="bg-[#1c2a44] p-4 rounded-xl">
          <h2 className="text-sm text-slate-400 uppercase mb-2">Live Telemetry</h2>
          <p>Speed: <span className="font-mono text-yellow-300">{telemetry?.speed_kts} kts</span></p>
          <p>Altitude: <span className="font-mono text-cyan-300">{telemetry?.altitude_ft} ft</span></p>
        </div>

        {/* Anomaly Console */}
        <div className="bg-[#1c2a44] p-4 rounded-xl border border-slate-700">
          <h2 className="text-sm text-slate-400 uppercase mb-2">XAI Diagnostic Console</h2>
          <div className={`p-2 rounded text-center font-bold ${telemetry?.anomaly_status === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {telemetry?.anomaly_status || "NORMAL"}
          </div>
          <p className="text-xs text-slate-300 mt-2">{telemetry?.diagnostic_reasoning}</p>
        </div>
      </div>
    </div>
  );
}