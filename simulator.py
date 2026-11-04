import requests

def get_flights(telemetry_source="Synthetic Anomaly Simulator", anomaly_scenario="None"):
    """
    Fetches flights based on telemetry source with built-in live feed fallback.
    """
    raw_flights = []
    
    if telemetry_source == "Live OpenSky Feed":
        try:
            # Attempt to fetch from OpenSky public API (bounding box over India/region)
            url = "https://opensky-network.org/api/states/all?lamin=5.0&lomin=68.0&lamax=37.0&lomax=98.0"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                states = data.get("states", [])
                if states:
                    for s in states[:15]:  # Take up to 15 live flights
                        raw_flights.append({
                            "callsign": (s[1] or "UNKNOWN").strip(),
                            "altitude": s[7] if s[7] is not None else 35000.0,
                            "velocity": s[9] if s[9] is not None else 450.0,
                            "vertical_rate": s[11] if s[11] is not None else 0.0,
                            "latitude": s[6],
                            "longitude": s[5]
                        })
        except Exception:
            pass  # Fall through to synthetic fallback if live request fails

    # Fallback or Synthetic Simulator
    if not raw_flights:
        raw_flights = get_simulated_flights(anomaly_scenario)
        
    return raw_flights

def get_simulated_flights(scenario="None"):
    """Returns baseline synthetic flight targets."""
    flights = [
        {"callsign": "AIC 302", "altitude": 35000, "velocity": 460.0, "vertical_rate": 0.0, "latitude": 17.3850, "longitude": 78.4867},
        {"callsign": "IGO 612", "altitude": 28000, "velocity": 420.0, "vertical_rate": 5.0, "latitude": 19.0760, "longitude": 72.8777},
        {"callsign": "VTI 821", "altitude": 38000, "velocity": 480.0, "vertical_rate": -2.0, "latitude": 13.0827, "longitude": 80.2707},
        {"callsign": "SEJ 415", "altitude": 1200, "velocity": 180.0, "vertical_rate": -15.0, "latitude": 28.6139, "longitude": 77.2090},
        {"callsign": "AXB 509", "altitude": 31000, "velocity": 440.0, "vertical_rate": 0.0, "latitude": 22.5726, "longitude": 88.3639}
    ]
    
    # Inject anomalies if selected
    if scenario == "Altitude Drop":
        flights[0]["altitude"] = 4000
        flights[0]["vertical_rate"] = -45.0
        flights[0]["callsign"] += " [ALT_DROP]"
    elif scenario == "Speed Burst":
        flights[1]["velocity"] = 650.0
        flights[1]["callsign"] += " [SPD_BURST]"
    elif scenario == "Vertical Rate Spike":
        flights[2]["vertical_rate"] = 55.0
        flights[2]["callsign"] += " [VRATE_SPIKE]"
        
    return flights