# simulator.py - Synthetic Anomaly Generator

def get_simulated_flights(anomaly_type="None"):
    """
    Returns a list of simulated flights in the airspace grid,
    with an optional injected anomaly for testing.
    """
    # Default baseline sample flights
    flights = [
        {
            "callsign": "AIC3KR",
            "longitude": 78.4867,
            "latitude": 17.3850,
            "altitude": 10500.0,
            "velocity": 240.0,
            "vertical_rate": 0.0
        },
        {
            "callsign": "VTXIC",
            "longitude": 79.1000,
            "latitude": 17.5000,
            "altitude": 2500.0,
            "velocity": 130.0,
            "vertical_rate": -5.0
        },
        {
            "callsign": "IGO6703",
            "longitude": 78.0000,
            "latitude": 17.2000,
            "altitude": 9000.0,
            "velocity": 220.0,
            "vertical_rate": 0.5
        }
    ]

    # Inject anomalies based on selection
    if anomaly_type == "Altitude Drop":
        flights[0]["altitude"] = 4000.0  # Sudden massive drop at cruise altitude
        flights[0]["vertical_rate"] = -40.0 # Critical rapid descent rate
    elif anomaly_type == "Speed Burst":
        flights[0]["velocity"] = 380.0   # Extreme speed burst
    elif anomaly_type == "Vertical Rate Spike":
        flights[0]["vertical_rate"] = 35.0 # Dangerous upward climb rate spike

    return flights