import concurrent.futures
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import logging
import threading
import time
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aeroflow-flight-radar.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

LIVE_FLIGHTS_CACHE_TTL_SECONDS = 10
ADSB_REQUEST_INTERVAL_SECONDS = 1.1
ADSB_RETRY_BACKOFF_SECONDS = 1
_live_flights_cache_lock = threading.Lock()
_live_flights_cache = None
_last_refresh_attempt_monotonic = None
_adsb_request_schedule_lock = threading.Lock()
_adsb_next_request_at = 0

# Major Indian Airspace Hubs (250 NM radius each covers pan-India corridors)
INDIA_HUBS = [
    {"name": "Hyderabad / Central", "lat": 17.2403, "lon": 78.4294},
    {"name": "Delhi / North", "lat": 28.5562, "lon": 77.1000},
    {"name": "Mumbai / West", "lat": 19.0896, "lon": 72.8656},
    {"name": "Bengaluru / South", "lat": 13.1986, "lon": 77.7066},
    {"name": "Kolkata / East", "lat": 22.6520, "lon": 88.4463},
    {"name": "Chennai / Southeast", "lat": 12.9941, "lon": 80.1709},
    {"name": "Ahmedabad / Northwest", "lat": 23.0734, "lon": 72.6266},
]

def evaluate_flight_dna(alt_ft, speed_kts, v_rate, squawk):
    if str(squawk) in ["7500", "7600", "7700"]:
        return (
            "CRITICAL",
            f"EMERGENCY SQUAWK {squawk}",
            f"Transponder broadcasting priority emergency code {squawk}.",
            f"🚨 Emergency Alert! Transponder code {squawk} indicates an active in-flight emergency."
        )
    if v_rate < -2800 and alt_ft > 5000:
        return (
            "CRITICAL",
            "RAPID DESCENT WARNING",
            f"Abnormal vertical descent rate of {v_rate} ft/min detected at {alt_ft} ft.",
            "🚨 Sudden Height Drop! The aircraft is descending faster than normal commercial limits."
        )
    if alt_ft > 15000 and 0 < speed_kts < 160:
        return (
            "CRITICAL",
            "AIRSPEED / GPS ANOMALY",
            f"Groundspeed ({speed_kts} kts) is critically low for cruise altitude ({alt_ft} ft).",
            "⚠️ Speed/Sensor Anomaly! Groundspeed does not match cruise altitude—possible GPS drift."
        )
    return (
        "NORMAL",
        "NOMINAL",
        "All ADS-B Flight DNA vectors (altitude, groundspeed, heading) within safe envelope.",
        "Everything is running smoothly. Operating safely within normal airspace parameters."
    )

def _wait_for_adsb_request_slot():
    global _adsb_next_request_at

    with _adsb_request_schedule_lock:
        delay = _adsb_next_request_at - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        _adsb_next_request_at = time.monotonic() + ADSB_REQUEST_INTERVAL_SECONDS

def _retry_after_seconds(response):
    retry_after = response.headers.get("Retry-After")
    try:
        return max(ADSB_RETRY_BACKOFF_SECONDS, float(retry_after))
    except (TypeError, ValueError):
        try:
            retry_at = parsedate_to_datetime(retry_after)
            delay = (retry_at - datetime.now(timezone.utc)).total_seconds()
            return max(ADSB_RETRY_BACKOFF_SECONDS, delay)
        except (TypeError, ValueError, OverflowError):
            return ADSB_RETRY_BACKOFF_SECONDS

def fetch_hub(hub):
    url = f"https://opendata.adsb.fi/api/v3/lat/{hub['lat']}/lon/{hub['lon']}/dist/250"
    with requests.Session() as session:
        for attempt in range(2):
            _wait_for_adsb_request_slot()
            try:
                resp = session.get(url, timeout=4)
                if resp.status_code == 200:
                    data = resp.json()
                    # v3 returns 'ac' or 'aircraft'
                    return hub["name"], (data.get("ac") or data.get("aircraft") or [])

                backoff = (
                    _retry_after_seconds(resp)
                    if resp.status_code == 429
                    else ADSB_RETRY_BACKOFF_SECONDS
                )
                logger.warning(
                    "adsb.fi request for hub %s failed with HTTP %s: %s",
                    hub["name"],
                    resp.status_code,
                    resp.reason,
                )
            except (requests.RequestException, ValueError) as exc:
                backoff = ADSB_RETRY_BACKOFF_SECONDS
                logger.warning("adsb.fi request for hub %s failed: %s", hub["name"], exc)

            if attempt == 0:
                time.sleep(backoff)

    logger.error("adsb.fi request for hub %s failed after retry", hub["name"])
    return hub["name"], []

def _fetch_all_india_flights():
    flights_by_hex = {}

    # Query all 7 Indian aviation hubs concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
        results = executor.map(fetch_hub, INDIA_HUBS)
        for sector_name, ac_list in results:
            for ac in ac_list:
                lat = ac.get("lat")
                lon = ac.get("lon")
                hex_id = ac.get("hex")
                if lat is None or lon is None or not hex_id:
                    continue
                # Keep within India bounding box
                if not (6.0 <= lat <= 37.0 and 68.0 <= lon <= 97.5):
                    continue
                if hex_id in flights_by_hex:
                    continue

                callsign = (ac.get("flight") or hex_id).strip()
                alt_baro = ac.get("alt_baro")
                alt_ft = 0 if alt_baro == "ground" or alt_baro is None else int(alt_baro)
                speed_kts = int(ac.get("gs") or 0)
                v_rate = int(ac.get("baro_rate") or 0)
                heading = int(ac.get("track") or 0)
                squawk = ac.get("squawk") or "N/A"
                ac_type = ac.get("t") or "ADS-B Aircraft"

                if alt_baro == "ground" or alt_ft < 100:
                    phase = "On Ground"
                elif v_rate > 400:
                    phase = "Climb"
                elif v_rate < -400:
                    phase = "Descent"
                elif alt_ft < 5000:
                    phase = "Approaching"
                else:
                    phase = "Cruise"

                status, rating, reasoning, plain_eng = evaluate_flight_dna(alt_ft, speed_kts, v_rate, squawk)

                flights_by_hex[hex_id] = {
                    "id": hex_id,
                    "callsign": callsign,
                    "airline": "Live ADS-B",
                    "sector": sector_name,
                    "aircraft_type": ac_type,
                    "phase": phase,
                    "speed_kts": speed_kts,
                    "altitude_ft": alt_ft,
                    "vertical_rate": v_rate,
                    "heading": heading,
                    "squawk": squawk,
                    "anomaly_status": status,
                    "anomaly_rating": rating,
                    "diagnostic_reasoning": reasoning,
                    "plain_english": plain_eng,
                    "source": "adsb.fi",
                    "lat": lat,
                    "lng": lon,
                }

    live_list = list(flights_by_hex.values())
    if len(live_list) > 0:
        return {
            "status": "live",
            "source": "All-India Live ADS-B Radar",
            "count": len(live_list),
            "flights": live_list,
        }

    # Secondary Check: OpenSky Network All-India Bounding Box
    try:
        os_url = "https://opensky-network.org/api/states/all?lamin=6.0&lomin=68.0&lamax=37.0&lomax=97.5"
        os_resp = requests.get(os_url, timeout=4)
        if os_resp.status_code == 200:
            states = os_resp.json().get("states") or []
            os_flights = []
            for s in states:
                lat, lon = s[6], s[5]
                if lat is not None and lon is not None:
                    callsign = (s[1] or s[0]).strip()
                    alt_ft = int(s[7] * 3.28084) if s[7] else 0
                    speed_kts = int(s[9] * 1.94384) if s[9] else 0
                    v_rate = int(s[11] * 196.85) if s[11] else 0
                    heading = int(s[10] or 0)
                    squawk = s[14] or "N/A"
                    status, rating, reasoning, plain_eng = evaluate_flight_dna(alt_ft, speed_kts, v_rate, squawk)
                    os_flights.append({
                        "id": s[0],
                        "callsign": callsign,
                        "airline": "OpenSky Live",
                        "sector": "India FIR",
                        "aircraft_type": "Commercial Jet",
                        "phase": "On Ground" if s[8] else ("Climb" if v_rate > 400 else ("Descent" if v_rate < -400 else "Cruise")),
                        "speed_kts": speed_kts,
                        "altitude_ft": alt_ft,
                        "vertical_rate": v_rate,
                        "heading": heading,
                        "squawk": squawk,
                        "anomaly_status": status,
                        "anomaly_rating": rating,
                        "diagnostic_reasoning": reasoning,
                        "plain_english": plain_eng,
                        "source": "opensky",
                        "lat": lat,
                        "lng": lon,
                    })
            if len(os_flights) > 0:
                return {
                    "status": "live",
                    "source": "OpenSky All-India Radar",
                    "count": len(os_flights),
                    "flights": os_flights,
                }
    except Exception:
        pass

    return None

@app.get("/api/live-flights")
def get_all_india_flights():
    global _last_refresh_attempt_monotonic, _live_flights_cache

    with _live_flights_cache_lock:
        now = time.monotonic()
        cache_age_seconds = (
            now - _live_flights_cache["cached_at"]
            if _live_flights_cache is not None
            else None
        )
        if (
            cache_age_seconds is None
            or cache_age_seconds >= LIVE_FLIGHTS_CACHE_TTL_SECONDS
        ) and (
            _last_refresh_attempt_monotonic is None
            or now - _last_refresh_attempt_monotonic >= LIVE_FLIGHTS_CACHE_TTL_SECONDS
        ):
            result = _fetch_all_india_flights()
            _last_refresh_attempt_monotonic = time.monotonic()
            if result is not None:
                _live_flights_cache = {
                    "result": result,
                    "cached_at": _last_refresh_attempt_monotonic,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
                cache_age_seconds = 0

        if _live_flights_cache is None:
            return {
                "status": "unavailable",
                "count": 0,
                "flights": [],
                "fetched_at": None,
                "cache_age_seconds": None,
            }

        cache_age_seconds = time.monotonic() - _live_flights_cache["cached_at"]
        response = dict(_live_flights_cache["result"])
        if cache_age_seconds >= LIVE_FLIGHTS_CACHE_TTL_SECONDS:
            response["status"] = "stale"
        return {
            **response,
            "fetched_at": _live_flights_cache["fetched_at"],
            "cache_age_seconds": round(cache_age_seconds, 3),
        }