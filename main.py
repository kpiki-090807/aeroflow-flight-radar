from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for React frontend
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
        "aircraft_id": "AI-784",
        "latitude": 17.44,
        "longitude": 78.38,
        "speed": 450,
        "altitude": 32000,
        "vertical_rate": 0,
        "is_anomaly": False,
        "explanation": "All parameters are within normal cruise operating envelopes."
    }