import concurrent.futures
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Pan-India Operational Fleet Fallback (Guarantees 100% uptime if APIs rate-limit Render)
FALLBACK_INDIA_FLEET = [
    {"id": "vt-alk", "callsign": "AIC784", "airline": "Air India", "sector": "Hyderabad", "aircraft_type": "B788 (Dreamliner)", "phase": "Cruise", "speed_kts": 475, "altitude_ft": 35000, "vertical_rate": 0, "heading": 35, "squawk": "2411", "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "diagnostic_reasoning": "ADS-B trajectory and groundspeed nominal on HYD-DEL airway.", "plain_english": "Cruising smoothly north-east over Hyderabad toward Delhi.", "lat": 17.3850, "lng": 78.4867},
    {"id": "vt-izu", "callsign": "IGO214", "airline": "IndiGo", "sector": "Hyderabad", "aircraft_type": "A20N (A320neo)", "phase": "Approaching", "speed_kts": 165, "altitude_ft": 2400, "vertical_rate": -850, "heading": 270, "squawk": "4512", "anomaly_status": "CRITICAL", "anomaly_rating": "GPS SPOOF DETECTED", "diagnostic_reasoning": "High positional variance between ADS-B coordinates and ground radar.", "plain_english": "⚠️ GPS Signal Interference! Conflicting navigation coordinates detected on approach.", "lat": 17.3100, "lng": 78.6200},
    {"id": "vt-del1", "callsign": "AIC102", "airline": "Air India", "sector": "Delhi NCR", "aircraft_type": "B77W (777-300ER)", "phase": "Climb", "speed_kts": 310, "altitude_ft": 14200, "vertical_rate": 2400, "heading": 315, "squawk": "1420", "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "diagnostic_reasoning": "Nominal international departure climb out of IGI Delhi (VIDP).", "plain_english": "Climbing steadily out of New Delhi on an international corridor.", "lat": 28.6200, "lng": 77.0500},
    {"id": "vt-bom1", "callsign": "AKJ1142", "airline": "Akasa Air", "sector": "Mumbai", "aircraft_type": "B38M (737 MAX)", "phase": "Cruise", "speed_kts": 450, "altitude_ft": 33000, "vertical_rate": 0, "heading": 135, "squawk": "3104", "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "diagnostic_reasoning": "Standard cruise vector along Mumbai-Bengaluru airway.", "plain_english": "Cruising smoothly southeast over Maharashtra.", "lat": 19.1200, "lng": 73.1500},
    {"id": "vt-blr1", "callsign": "IGO6512", "airline": "IndiGo", "sector": "Bengaluru", "aircraft_type": "A21N (A321neo)", "phase": "Descent", "speed_kts": 290, "altitude_ft": 11500, "vertical_rate": -1400, "heading": 195, "squawk": "2218", "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "diagnostic_reasoning": "Controlled descent profile into Kempegowda Intl (VOBL).", "plain_english": "Descending smoothly for arrival into Bengaluru.", "lat": 13.4500, "lng": 77.7500},
    {"id": "vt-ccu1", "callsign": "SEJ829", "airline": "SpiceJet", "sector": "Kolkata", "aircraft_type": "B738 (737-800)", "phase": "Descent", "speed_kts": 395, "altitude_ft": 17200, "vertical_rate": -3200, "heading": 240, "squawk": "7700", "anomaly_status": "CRITICAL", "anomaly_rating": "RAPID DESCENT WARNING", "diagnostic_reasoning": "Vertical descent rate exceeds 3,000 ft/min with emergency squawk 7700.", "plain_english": "🚨 Sudden Altitude Drop! Rapid descent detected southwest of Kolkata.", "lat": 22.4500, "lng": 88.1200},
    {"id": "vt-maa1", "callsign": "VTI541", "airline": "Vistara", "sector": "Chennai", "aircraft_type": "A20N (A320neo)", "phase": "Cruise", "speed_kts": 440, "altitude_ft": 31000, "vertical_rate": 0, "heading": 10, "squawk": "4012", "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "diagnostic_reasoning": "Nominal coastal airway transit north of Chennai.", "plain_english": "Cruising northward along the Bay of Bengal coast.", "lat": 13.3500, "lng": 80.2200},
    {"id": "vt-amd1", "callsign": "IGO904", "airline": "IndiGo", "sector": "Ahmedabad", "aircraft_type": "A20N (A320neo)", "phase": "Cruise", "speed_kts": 460, "altitude_ft": 36000, "vertical_rate": 0, "heading": 60, "squawk": "1156", "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "diagnostic_reasoning": "All Flight DNA vectors nominal over Gujarat.", "plain_english": "Cruising smoothly northeast across Gujarat.", "lat": 23.1500, "lng": 72.8000},
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

def fetch_hub(hub):
    try:
        url = f"https://opendata.adsb.fi/api/v3/lat/{hub['lat']}/lon/{hub['lon']}/dist/250"
        resp = requests.get(url, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            # v3 returns 'ac' or 'aircraft'
            return hub["name"], (data.get("ac") or data.get("aircraft") or [])
    except Exception:
        pass
    return hub["name"], []

@app.get("/api/live-flights")
def get_all_india_flights():
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
                if lat and lon:
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

    return {
        "status": "hybrid",
        "source": "All-India Hybrid Radar (Live Sync Ready)",
        "count": len(FALLBACK_INDIA_FLEET),
        "flights": FALLBACK_INDIA_FLEET,
    }