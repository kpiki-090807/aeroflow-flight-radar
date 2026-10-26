import streamlit as st
import folium
from streamlit_folium import st_folium
import requests
import pandas as pd

# Page Configuration for War Room Aesthetic
st.set_page_config(page_title="Real-Time Flight Anomaly Radar", layout="wide")

st.title("✈️ Real-Time Flight Anomaly Radar [War Room]")
st.markdown("Monitoring live airspace behaviour, Flight DNA baselines, and Explainable AI alerts.")

# Sidebar Controls
st.sidebar.header("Radar Controls")
selected_view = st.sidebar.selectbox("Select View Mode", ["Live Airspace Map", "Flight Time Machine Playback", "Anomaly Simulator Lab"])
refresh_rate = st.sidebar.slider("Data Refresh Rate (seconds)", 5, 30, 10)

# Function to fetch live flight data from OpenSky Network
def fetch_live_flights():
    url = "https://opensky-network.org/api/states/all"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
    except Exception as e:
        st.warning(f"API connection failed: {e}. Using empty state.")
        return []

    flights = []
    if "states" in data and data["states"]:
        for state in data["states"][:15]: # Limit to first 15 flights for performance
            lat = state[6]
            lon = state[5]
            if lat is not None and lon is not None:
                flights.append({
                    "callsign": state[1].strip() if state[1] else "UNKNOWN",
                    "lat": lat,
                    "lon": lon,
                    "altitude": state[7] if state[7] else 0,
                    "velocity": state[9] if state[9] else 0
                })
    return flights

# Main Dashboard Layout - Interactive Map Component
st.subheader("Live Airspace Grid")

# Create a Folium map centered over a target region (e.g., India coordinates)
m = folium.Map(location=[20.5937, 78.9629], zoom_start=5)# Fetch flights and add markers to the map
flight_data = fetch_live_flights()
for flight in flight_data:
    folium.CircleMarker(
        location=[flight["lat"], flight["lon"]],
        radius=5,
        color="cyan",
        fill=True,
        fill_color="cyan",
        popup=f"Callsign: {flight['callsign']} | Alt: {flight['altitude']}m"
    ).add_to(m)

# Render map inside Streamlit
st_folium(m, width=1200, height=500)

# Explanatory AI Panel Section
st.markdown("---")
st.subheader("🤖 Explainable AI Live Feed")
if flight_data:
    st.success(f"Successfully tracking {len(flight_data)} active flights in airspace. System normal.")
else:
    st.info("Waiting for live telemetry stream integration...")