import React, { useState, useEffect } from 'react';
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

const SECTOR_PRESETS = [
  { label: 'All India', center: [22.0, 79.0], zoom: 5 },
  { label: 'Hyderabad', center: [17.385, 78.4867], zoom: 8 },
  { label: 'Delhi NCR', center: [28.556, 77.100], zoom: 8 },
  { label: 'Mumbai', center: [19.089, 72.865], zoom: 8 },
  { label: 'Bengaluru', center: [13.198, 77.706], zoom: 8 },
];

const DEMO_FLIGHTS = [
  {
    id: 'demo-1',
    callsign: 'DEMO101',
    sector: 'Hyderabad',
    aircraft_type: 'Demo A320',
    phase: 'Cruise',
    speed_kts: 450,
    altitude_ft: 32000,
    vertical_rate: 0,
    heading: 35,
    squawk: '0000',
    anomaly_status: 'NORMAL',
    anomaly_rating: 'SIMULATED',
    diagnostic_reasoning: 'Simulated demonstration flight; no live telemetry is used.',
    plain_english: 'This is a simulated aircraft position for demonstration only.',
    lat: 17.385,
    lng: 78.4867,
    source: 'demo',
  },
  {
    id: 'demo-2',
    callsign: 'DEMO202',
    sector: 'Delhi NCR',
    aircraft_type: 'Demo B737',
    phase: 'Cruise',
    speed_kts: 430,
    altitude_ft: 34000,
    vertical_rate: 0,
    heading: 270,
    squawk: '0000',
    anomaly_status: 'NORMAL',
    anomaly_rating: 'SIMULATED',
    diagnostic_reasoning: 'Simulated demonstration flight; no live telemetry is used.',
    plain_english: 'This is a simulated aircraft position for demonstration only.',
    lat: 28.5562,
    lng: 77.1,
    source: 'demo',
  },
];

export default function App() {
  const [liveFlights, setLiveFlights] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [feedSource, setFeedSource] = useState("Connecting to live radar...");
  const [feedStatus, setFeedStatus] = useState("loading");
  const [cacheAgeSeconds, setCacheAgeSeconds] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isLive, setIsLive] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetView, setTargetView] = useState(SECTOR_PRESETS[0]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    let activeController = null;
    let pollTimeout = null;
    let disposed = false;

    const poll = async () => {
      if (document.hidden || disposed) return;

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      setIsUpdating(true);
      const deadline = Date.now() + 60000;
      let wakeTimedOut = false;
      let shouldScheduleNextPoll = false;
      const wakeTimeout = setTimeout(() => {
        wakeTimedOut = true;
        controller.abort();
      }, 60000);

      try {
        let retryDelay = 2000;
        while (!controller.signal.aborted && Date.now() < deadline) {
          try {
            const response = await fetch(`${API_URL}/api/live-flights`, { signal: controller.signal });
            if (!response.ok) {
              const error = new Error(`Live radar request failed with status ${response.status}`);
              error.retryable = [502, 503, 504].includes(response.status);
              throw error;
            }

            const data = await response.json();
            if (controller.signal.aborted || disposed) return;

            const validFlights = Array.isArray(data.flights)
              ? data.flights.filter((flight) => flight.source === 'adsb.fi' || flight.source === 'opensky')
              : [];
            if (data.status === 'live' || data.status === 'stale') {
              setLiveFlights(validFlights);
              setFeedSource(data.source || 'All-India Live Radar');
              setFeedStatus(data.status);
              setCacheAgeSeconds(data.status === 'stale' ? data.cache_age_seconds : null);
            } else {
              setLiveFlights([]);
              setFeedSource('Live feed unavailable');
              setFeedStatus('unavailable');
              setCacheAgeSeconds(null);
            }
            setFetchedAt(data.fetched_at || null);
            setIsLive(data.status === 'live');
            setIsWakingUp(false);
            shouldScheduleNextPoll = true;
            break;
          } catch (error) {
            if (controller.signal.aborted || disposed) {
              if (wakeTimedOut && !disposed) {
                setIsWakingUp(false);
                setLiveFlights([]);
                setFeedSource('Live feed unavailable');
                setFeedStatus('unavailable');
                setCacheAgeSeconds(null);
                setFetchedAt(null);
                setIsLive(false);
                shouldScheduleNextPoll = true;
              }
              return;
            }

            const retryable = error.retryable || error instanceof TypeError;
            const remainingMs = deadline - Date.now();
            if (!retryable || remainingMs <= 0) throw error;

            setIsWakingUp(true);
            await new Promise((resolve) => setTimeout(resolve, Math.min(retryDelay, remainingMs)));
            retryDelay = Math.min(retryDelay * 2, 10000);
          }
        }
        if (wakeTimedOut && !disposed) {
          setIsWakingUp(false);
          setLiveFlights([]);
          setFeedSource('Live feed unavailable');
          setFeedStatus('unavailable');
          setCacheAgeSeconds(null);
          setFetchedAt(null);
          setIsLive(false);
          shouldScheduleNextPoll = true;
        }
      } catch {
        if (!controller.signal.aborted && !disposed) {
          setIsWakingUp(false);
          setLiveFlights([]);
          setFeedSource('Live feed unavailable');
          setFeedStatus('unavailable');
          setCacheAgeSeconds(null);
          setFetchedAt(null);
          setIsLive(false);
          shouldScheduleNextPoll = true;
        }
      } finally {
        clearTimeout(wakeTimeout);
        if (activeController === controller) {
          activeController = null;
          if (!disposed) {
            setIsUpdating(false);
            if (shouldScheduleNextPoll && !document.hidden) {
              pollTimeout = setTimeout(poll, 10000);
            }
          }
        }
      }
    };

    const startPolling = (abortCurrent = false) => {
      if (document.hidden || disposed) return;
      clearTimeout(pollTimeout);
      if (abortCurrent) activeController?.abort();
      void poll();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
        activeController?.abort();
        activeController = null;
        setIsUpdating(false);
      } else {
        startPolling(true);
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      disposed = true;
      clearTimeout(pollTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activeController?.abort();
    };
  }, [API_URL]);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const flights = demoMode ? DEMO_FLIGHTS : liveFlights;
  const activeFlight = flights.find((f) => f.id === selectedFlightId) || flights[0] || null;
  const fetchedAtMilliseconds = fetchedAt ? Date.parse(fetchedAt) : NaN;
  const secondsSinceUpdate = Number.isFinite(fetchedAtMilliseconds)
    ? Math.max(0, Math.floor((currentTime - fetchedAtMilliseconds) / 1000))
    : null;

  const criticalCount = flights.filter((f) => f.anomaly_status === 'CRITICAL').length;
  const filteredFlights = flights.filter(
    (f) =>
      f.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.sector && f.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0b1020] text-[#e9eef6] p-4 md:p-6 font-sans">
      {demoMode && (
        <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-400 px-4 py-3 text-center text-sm font-extrabold tracking-widest text-slate-950" role="status">
          SIMULATED DATA — Demo mode is on. These flights are not live.
        </div>
      )}
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
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(event) => setDemoMode(event.target.checked)}
              className="accent-amber-400"
            />
            Demo mode
          </label>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
            <span className={`w-2 h-2 rounded-full ${isLive && !demoMode ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            {demoMode ? 'SIMULATED DATA' : feedSource}
          </div>
          <p className="text-[11px] text-slate-400">
            {demoMode || secondsSinceUpdate === null
              ? 'Last updated —'
              : `Last updated ${secondsSinceUpdate}s ago`}
            {' · '}{flights.length} aircraft{' · '}{demoMode ? 'SIMULATED DATA' : feedSource}
          </p>
          {isUpdating && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 animate-pulse" role="status">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300"></span>
              Updating...
            </span>
          )}
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
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Position Updates</p>
          <p className="text-lg font-mono font-bold text-sky-400 mt-1">10s API Polling</p>
        </div>
      </div>

      {!demoMode && feedStatus === 'stale' && (
        <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-300" role="status">
          Showing data from {Math.max(0, Math.round(cacheAgeSeconds ?? 0))} seconds ago
        </div>
      )}
      {!demoMode && isWakingUp && (
        <div className="mb-4 rounded-lg border border-sky-500/50 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-200" role="status">
          Waking up the server, this can take up to a minute
        </div>
      )}

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
              {!demoMode && (feedStatus === 'loading' || feedStatus === 'unavailable') && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#0b1020]/75 text-center font-semibold text-white">
                  {isWakingUp ? 'Waking up the server, this can take up to a minute' : feedStatus === 'loading' ? 'Connecting to live radar...' : 'Live feed unavailable'}
                </div>
              )}
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
          {activeFlight ? (
            <>
          <div className="bg-[#1c2a44]/80 border border-slate-700/70 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Selected Flight DNA Profile</span>
                <div className="text-3xl font-mono font-extrabold text-[#c9a46a] mt-0.5">{activeFlight.callsign}</div>
              </div>
              {demoMode && (
                <span className="rounded border border-amber-400/60 bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-300">
                  SIMULATED DATA
                </span>
              )}
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
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-700/70 bg-[#1c2a44]/80 p-6 text-center text-sm font-semibold text-slate-300" role="status">
              {feedStatus === 'loading' ? 'Connecting to live radar...' : 'Live feed unavailable'}
            </div>
          )}
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
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-400">
                    {feedStatus === 'loading' ? 'Connecting to live radar...' : 'Live feed unavailable'}
                  </td>
                </tr>
              ) : filteredFlights.map((flight) => (
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