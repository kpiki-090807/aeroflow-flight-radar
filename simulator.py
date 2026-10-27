# simulator.py - Anomaly Simulation Engine

def inject_synthetic_anomaly(flight_data, anomaly_type="altitude_drop"):
    """
    Injects synthetic flight anomalies into telemetry data for XAI testing.
    Types: 'altitude_drop', 'speed_burst', 'vrate_spike'
    """
    simulated_flight = flight_data.copy()
    
    if anomaly_type == "altitude_drop":
        simulated_flight["altitude"] = 1200  # Extreme sudden drop to unsafe low altitude
        simulated_flight["vertical_rate"] = -45.0  # Dangerously rapid descent rate
        simulated_flight["callsign"] = simulated_flight["callsign"] + "_SIM_DROP"
        
    elif anomaly_type == "speed_burst":
        simulated_flight["velocity"] = 450.0  # Supersonic burst exceeding civilian limits
        simulated_flight["callsign"] = simulated_flight["callsign"] + "_SIM_FAST"
        
    elif anomaly_type == "vrate_spike":
        simulated_flight["vertical_rate"] = 55.0  # Unrealistic upward climb rate
        simulated_flight["callsign"] = simulated_flight["callsign"] + "_SIM_CLIMB"
        
    return simulated_flight