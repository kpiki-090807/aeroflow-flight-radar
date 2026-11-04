@app.get("/api/telemetry")
def get_telemetry():
    return {
        "flight_id": "AI-784",
        "phase": "Approaching",
        "speed_kts": 450,
        "altitude_ft": 32000,
        "anomaly_status": "NORMAL",
        "diagnostic_reasoning": "All parameters are within normal cruise operating envelopes."
    }