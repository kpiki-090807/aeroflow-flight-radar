import math
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

# Hyderabad Airport (RGIA) center & radius in nautical miles (covers all of Telangana)
HYD_LAT = 17.2403
HYD_LON = 78.4294
RADIUS_NM = 180

FALLBACK_FLEET = [
    {
        "id": "vt-alk",
        "callsign": "AIC784",
        "airline": "Air India",
        "aircraft_type": "B788 (Dreamliner)",
        "phase": "Cruise",
        "speed_kts": 465,
        "altitude_ft": 34000,
        "vertical_rate": 0,
        "heading": 45,
        "squawk": "2411",
        "anomaly_status": "NORMAL",
        "anomaly_rating": "NOMINAL",
        "diagnostic_reasoning": "ADS-B trajectory, barometric altitude, and groundspeed align with filed flight plan.",
        "plain_english": "Everything is running smoothly. The aircraft is cruising safely at high altitude over Hyderabad.",
        "lat": 17.3850,
        "lng": 78.4867,
    },
    {
        "id": "vt-izu",
        "callsign": "IGO214",
        "airline": "IndiGo",
        "aircraft_type": "A20N (A320neo)",
        "phase": "Approaching",
        "speed_kts": 165,
        "altitude_ft": 2400,
        "vertical_rate": -850,
        "heading": 270,
        "squawk": "4512",
        "anomaly_status": "CRITICAL",
        "anomaly_rating": "GPS SPOOF DETECTED",
        "diagnostic_reasoning": "High positional drift between ADS-B coordinates and multilateration ground stations.",
        "plain_english": "⚠️ GPS Signal Interference! The airplane's navigation system is receiving conflicting or spoofed location coordinates.",
        "lat": 17.3100,
        "lng": 78.6200,
    },
    {
        "id": "vt-tnv",
        "callsign": "VTI881",
        "airline": "Vistara",
        "aircraft_type": "A21N (A321neo)",
        "phase": "Climb",
        "speed_kts": 245,
        "altitude_ft": 6800,
        "vertical_rate": 2100,
        "heading": 15,
        "squawk": "1104",
        "anomaly_status": "NORMAL",
        "anomaly_rating": "NOMINAL",
        "diagnostic_reasoning": "Nominal departure climb profile out of RGIA Shamshabad.",
        "plain_english": "Taking off smoothly and climbing safely toward its cruising altitude.",
        "lat": 17.4800,
        "lng": 78.4400,
    },
    {
        "id": "vt-syd",
        "callsign": "SEJ342",
        "airline": "SpiceJet",
        "aircraft_type": "B38M (737 MAX)",
        "phase": "Descent",
        "speed_kts": 410,
        "altitude_ft": 16500,
        "vertical_rate": -3100,
        "heading": 210,
        "squawk": "7700",
        "anomaly_status": "CRITICAL",
        "anomaly_rating": "RAPID DESCENT WARNING",
        "diagnostic_reasoning": "Vertical descent rate exceeds 3,000 ft/min outside standard STAR approach corridor.",
        "plain_english": "🚨 Sudden Altitude Drop! The plane is losing height rapidly and broadcasting an emergency squawk.",
        "lat": 17.8500,
        "lng": 79.3500,
    },
]

def evaluate_flight_dna(alt_ft, speed_kts, v_rate, squawk):
    """Analyzes real-time telemetry parameters for anomalies."""
    if str(squawk) in ["7500", "7600", "7700"]:
        return (
            "CRITICAL",
            f"EMERGENCY SQUAWK {squawk}",
            f"Transponder broadcasting priority emergency code {squawk}.",
            f"🚨 Emergency Alert! The pilot has set transponder code {squawk}, signaling an urgent in-flight situation to Air Traffic Control."
        )
    if v_rate < -2800 and alt_ft > 5000:
        return (
            "CRITICAL",
            "RAPID DESCENT WARNING",
            f"Abnormal vertical descent rate of {v_rate} ft/min detected at {alt_ft} ft.",
            "🚨 Sudden Height Drop! The aircraft is descending significantly faster than normal commercial limits."
        )
    if alt_ft > 15000 and speed_kts < 160 and speed_kts > 0:
        return (
            "CRITICAL",
            "AIRSPEED / GPS ANOMALY",
            f"Groundspeed ({speed_kts} kts) is critically low for cruise altitude ({alt_ft} ft).",
            "⚠️ Speed/Sensor Anomaly! The aircraft's reported speed does not match its high altitude—possible strong headwind or GPS drift."
        )
    return (
        "NORMAL",
        "NOMINAL",
        "All ADS-B Flight DNA vectors (altitude, groundspeed, vertical rate) within safe envelope.",
        "Everything is running smoothly. The flight is operating safely within normal parameters."
    )

@app.get("/api/live-flights")
def get_live_flights():
    # Primary Source: ADSB.fi (Reliable real-time live flight feed)
    try:
        url = f"https://opendata.adsb.fi/api/v2/lat/{HYD_LAT}/lon/{HYD_LON}/dist/{RADIUS_NM}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            aircraft_list = data.get("aircraft", [])
            live_flights = []

            for ac in aircraft_list:
                lat = ac.get("lat")
                lon = ac.get("lon")
                if lat is None or lon is None:
                    continue

                callsign = (ac.get("flight") or ac.get("hex") or "UNKNOWN").strip()
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

                live_flights.append({
                    "id": ac.get("hex", callsign),
                    "callsign": callsign,
                    "airline": "Live ADS-B",
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
                    "lng": lon
                })

            if len(live_flights) > 0:
                return {"status": "live", "source": "ADSB.fi Live Radar", "count": len(live_flights), "flights": live_flights}
    except Exception as e:
        print(f"ADSB.fi fetch error: {e}")

    # Fallback if offline or no flights detected
    return {"status": "fallback", "source": "Simulated Telangana Airspace", "count": len(FALLBACK_FLEET), "flights": FALLBACK_FLEET}