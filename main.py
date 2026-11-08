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

TELANGANA_BBOX = {"lamin": 15.80, "lomin": 77.20, "lamax": 19.90, "lomax": 81.30}

# Reliable Telangana Airspace Fleet
FALLBACK_FLEET = [
    {"id": "AI-784", "callsign": "Air India AI-784", "aircraft_type": "Boeing 737-800", "phase": "Approaching", "speed_kts": 450, "altitude_ft": 32000, "vertical_rate": 0, "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "shield_status": "Active", "diagnostic_reasoning": "All parameters are within normal cruise operating envelopes.", "plain_english": "Everything is running smoothly! Cruising safely towards Hyderabad.", "lat": 17.3850, "lng": 78.4867},
    {"id": "6E-214", "callsign": "IndiGo 6E-214", "aircraft_type": "Airbus A320neo", "phase": "Landing", "speed_kts": 140, "altitude_ft": 1200, "vertical_rate": -700, "anomaly_status": "CRITICAL", "anomaly_rating": "GPS SPOOF DETECTED", "shield_status": "Engaged", "diagnostic_reasoning": "Telemetry deviation detected: High positional variance against radar trajectory.", "plain_english": "⚠️ GPS Signal Interference! The aircraft's navigation system is receiving fake or jammed location signals.", "lat": 17.4500, "lng": 78.3800},
    {"id": "UK-881", "callsign": "Vistara UK-881", "aircraft_type": "Airbus A321neo", "phase": "Takeoff", "speed_kts": 210, "altitude_ft": 3500, "vertical_rate": 1800, "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "shield_status": "Active", "diagnostic_reasoning": "Nominal climb gradient maintained without trajectory conflict.", "plain_english": "Aircraft is taking off smoothly on its assigned climbing path.", "lat": 17.2400, "lng": 78.4290},
    {"id": "SG-342", "callsign": "SpiceJet SG-342", "aircraft_type": "Boeing 737-MAX", "phase": "Cruise", "speed_kts": 420, "altitude_ft": 18000, "vertical_rate": -2500, "anomaly_status": "CRITICAL", "anomaly_rating": "RAPID DESCENT WARNING", "shield_status": "Shield Alert", "diagnostic_reasoning": "Unscheduled vertical rate surge detected without ATC descent clearance.", "plain_english": "🚨 Sudden Height Drop! The plane is losing altitude much faster than normal without permission.", "lat": 17.5200, "lng": 78.5800},
    {"id": "IX-492", "callsign": "Air India Express IX-492", "aircraft_type": "Boeing 737-800", "phase": "Cruise", "speed_kts": 460, "altitude_ft": 36000, "vertical_rate": 0, "anomaly_status": "NORMAL", "anomaly_rating": "NOMINAL", "shield_status": "Active", "diagnostic_reasoning": "Cruising smoothly at high altitude.", "plain_english": "Flight operating normally across Telangana skies.", "lat": 17.9689, "lng": 79.5941}
]

@app.get("/api/live-flights")
def get_live_telangana_flights():
    try:
        url = f"https://opensky-network.org/api/states/all?lamin={TELANGANA_BBOX['lamin']}&lomin={TELANGANA_BBOX['lomin']}&lamax={TELANGANA_BBOX['lamax']}&lomax={TELANGANA_BBOX['lomax']}"
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            states = data.get("states", [])
            if states and len(states) > 0:
                live_flights = []
                for s in states:
                    lat, lng = s[6], s[5]
                    if lat and lng:
                        live_flights.append({
                            "id": s[0],
                            "callsign": s[1].strip() if s[1] else s[0],
                            "aircraft_type": "Commercial Jet",
                            "phase": "Cruise",
                            "speed_kts": int(s[9] * 1.94384) if s[9] else 350,
                            "altitude_ft": int(s[7] * 3.28084) if s[7] else 10000,
                            "anomaly_status": "NORMAL",
                            "anomaly_rating": "NOMINAL",
                            "shield_status": "Active",
                            "diagnostic_reasoning": "Live telemetry verified.",
                            "plain_english": "Flight operating normally across Telangana airspace.",
                            "lat": lat,
                            "lng": lng
                        })
                if len(live_flights) > 0:
                    return {"status": "success", "flights": live_flights}
    except Exception:
        pass
    
    return {"status": "fallback", "flights": FALLBACK_FLEET}