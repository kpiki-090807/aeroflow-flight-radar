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

@app.get("/api/telemetry")
def get_telemetry():
    return {
        "flight_id": "AI-784",
        "aircraft_type": "Boeing 737-800",
        "phase": "Approaching",  # Landing, Approaching, Takeoff, Cruise
        "speed_kts": 450,
        "altitude_ft": 32000,
        "vertical_rate": 0,
        "anomaly_status": "NORMAL",  # or CRITICAL
        "anomaly_rating": "NOMINAL",
        "diagnostic_reasoning": "All parameters are within normal cruise operating envelopes."
    }