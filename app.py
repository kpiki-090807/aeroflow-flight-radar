# app.py - Real-Time Flight Anomaly Radar (Production-Grade War Room Dashboard)

import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
import requests
from datetime import datetime
from baseline import calculate_baseline
from simulator import get_simulated_flights

# 1. Page Configuration & War Room Styling
st.set_page_config(
    page_title="Flight Anomaly Radar",
    page_icon="✈️",
    layout="wide"
)

st.markdown("""
<style>
    /* Sleek minimal dark card styling */
    div[data-testid="stExpander"] {
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 8px !important;
        background-color: rgba(15, 23, 42, 0.6) !important;
    }
    .critical-header {
        color: #ef4444;
        font-weight: 600;
        font-size: 1.1rem;
        margin-top: 1rem;
    }
    .warning-header {
        color: #f59e0b;
        font-weight: 600;
        font-size: 1.1rem;
        margin-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

st.title("🛰️ Real-Time Flight Anomaly Radar")
st.caption("War Room Airspace Surveillance & Aerodynamic Flight DNA Diagnostics")

# 2. Helper Functions
def derive_flight_metrics(alt, vrate, speed):
    if alt < 1000 and vrate > 2.0:
        phase = "🛫 Taking Off"
        est_dist_km = 350.0
    elif alt < 3000 and vrate < -2.0:
        phase = "🛬 Landing"
        est_dist_km = max(10.0, round((alt / 1000) * 15, 1))
    elif alt < 100:
        phase = "🅿️ Ground / Taxiing"
        est_dist_km = 0.0
    else:
        phase = "✈️ Cruising / En Route"
        est_dist_km = 450.0

    speed_kmh = max(speed * 3.6, 1.0)
    duration_mins = int((est_dist_km / speed_kmh) * 60) if est_dist_km > 0 else 0

    return phase, est_dist_km, duration_mins

# 3. Sidebar Controls & Simulator
st.sidebar.header("🎛️ Radar Controls")
data_source = st.sidebar.radio("Telemetry Source", ["Live OpenSky Feed", "Synthetic Anomaly Simulator"])

flights = []
if data_source == "Synthetic Anomaly Simulator":
    st.sidebar.markdown("---")
    st.sidebar.subheader("🚨 Inject Test Scenario")
    anomaly_type = st.sidebar.selectbox("Scenario Type", ["None", "Altitude Drop", "Speed Burst", "Vertical Rate Spike"])
    flights = get_simulated_flights(anomaly_type)
else:
    # Fetch live OpenSky API feed
    try:
        url = "https://opensky-network.org/api/states/all"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            states = response.json().get("states", [])
            for s in states[:30]:  # Limit sample size for performance
                if s[5] and s[6] and s[9] is not None:  # Ensure lon, lat, velocity exist
                    flights.append({
                        "callsign": s[1].strip() if s[1] else "UNKNOWN",
                        "longitude": s[5],
                        "latitude": s[6],
                        "altitude": s[7] if s[7] is not None else 0.0,
                        "velocity": s[9] if s[9] is not None else 0.0,
                        "vertical_rate": s[11] if s[11] is not None else 0.0
                    })
    except Exception as e:
        st.warning(f"Live feed connection warning: {e}. Falling back to default simulation.")
        flights = get_simulated_flights("None")

if not flights:
    flights = get_simulated_flights("None")

# 4. Process Flight Baselines & Metrics
normal_count = 0
anomaly_count = 0

for f in flights:
    # Derive operational phase, distance, and duration
    phase, dist_km, duration_mins = derive_flight_metrics(f["altitude"], f["vertical_rate"], f["velocity"])
    f["phase"] = phase
    f["dist_km"] = dist_km
    f["duration_mins"] = duration_mins

    # Calculate baseline compliance
    baseline_info = calculate_baseline(f["altitude"], f["velocity"], f["vertical_rate"])
    f["baseline"] = baseline_info

    if baseline_info["baseline_status"] == "NORMAL":
        normal_count += 1
    else:
        anomaly_count += 1

# Metric Overview Cards
col1, col2, col3 = st.columns(3)
col1.metric("Total Tracked Targets", len(flights))
col2.metric("Normal Operations", normal_count)
col3.metric("Flagged Deviations", anomaly_count, delta_color="inverse")

st.markdown("---")

# 5. Interactive Folium Map
st.subheader("🗺️ Live Airspace Surveillance Map")
# Change your folium.Map initialization to this:
m = folium.Map(
    location=[17.3850, 78.4867], 
    zoom_start=6, 
    tiles="OpenStreetMap"
)

for f in flights:
    lat, lon = f["latitude"], f["longitude"]
    callsign = f["callsign"]
    status_flag = f["baseline"]["baseline_status"]
    severity = f["baseline"].get("severity", "LOW")

    # Color code markers based on severity
    marker_color = "blue"
    if status_flag != "NORMAL":
        marker_color = "red" if severity == "CRITICAL" else "orange"

    plane_icon = folium.Icon(
        color=marker_color,
        icon="plane",
        prefix="fa"
    )

    popup_html = f"""
    <div style="font-family: sans-serif; width: 180px;">
        <b>Callsign:</b> {callsign}<br>
        <b>Phase:</b> {f['phase']}<br>
        <b>Altitude:</b> {f['altitude']} m<br>
        <b>Velocity:</b> {f['velocity']} m/s<br>
        <b>Dist Remaining:</b> {f['dist_km']} km<br>
        <b>Est. Duration:</b> {f['duration_mins']} mins<br>
        <b>Status:</b> {status_flag}
    </div>
    """

    folium.Marker(
        location=[lat, lon],
        popup=folium.Popup(popup_html, max_width=250),
        icon=plane_icon
    ).add_to(m)

st_folium(m, width="100%", height=500)

# 6. Dual-Section XAI Diagnostics Panel
st.markdown("---")
st.subheader("🤖 Explainable AI (XAI) Flight Diagnostics")
st.caption("Automated rule justification categorized by operational severity level.")

critical_flights = [f for f in flights if f["baseline"].get("severity") == "CRITICAL"]
minor_flights = [f for f in flights if f["baseline"].get("severity") == "WARNING"]

# SECTION 1: CRITICAL THREATS
st.markdown("<p class='critical-header'>🚨 Critical Airspace Threats</p>", unsafe_allow_html=True)

if critical_flights:
    for f in critical_flights:
        with st.expander(f"🔴 CRITICAL ALERT: Flight {f['callsign']} - Immediate Attention Required"):
            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown(f"**Flight Phase:** {f['phase']}")
                st.markdown(f"**Est. Distance Remaining:** {f['dist_km']} km")
                st.markdown(f"**Est. Time En Route:** ~{f['duration_mins']} mins")
                st.markdown(f"**Altitude:** {f['altitude']} m | **Velocity:** {f['velocity']} m/s")
            with col_b:
                info = f["baseline"]
                st.markdown("**Diagnostic Breakdown:**")
                if not info["is_speed_normal"]:
                    st.error(f"• Velocity breach! Speed ({f['velocity']} m/s) severely outside limit [{info['expected_min_speed']} - {info['expected_max_speed']} m/s].")
                if not info["is_vrate_normal"]:
                    st.error(f"• Vertical rate breach! Climb/descent rate ({f['vertical_rate']} m/s) exceeds safe aerodynamic envelope.")
                st.info("💡 **Recommended Action:** Priority transponder re-verification and immediate ATC contact.")
else:
    st.success("✅ No critical airspace threats detected.")

# SECTION 2: MINOR DEVIATIONS
st.markdown("<p class='warning-header'>⚠️ Minor Operational Deviations</p>", unsafe_allow_html=True)

if minor_flights:
    for f in minor_flights:
        with st.expander(f"🟡 MINOR DEVIATION: Flight {f['callsign']} - Operational Adjustment"):
            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown(f"**Flight Phase:** {f['phase']}")
                st.markdown(f"**Est. Distance Remaining:** {f['dist_km']} km")
                st.markdown(f"**Est. Time En Route:** ~{f['duration_mins']} mins")
                st.markdown(f"**Altitude:** {f['altitude']} m | **Velocity:** {f['velocity']} m/s")
            with col_b:
                info = f["baseline"]
                st.markdown("**Diagnostic Breakdown:**")
                if not info["is_speed_normal"]:
                    st.warning(f"• Slight speed variation ({f['velocity']} m/s) vs target band [{info['expected_min_speed']} - {info['expected_max_speed']} m/s].")
                if not info["is_vrate_normal"]:
                    st.warning(f"• Minor vertical rate adjustment ({f['vertical_rate']} m/s).")
                st.caption("ℹ️ **Status:** Likely standard vectoring or altitude holding pattern.")
else:
    st.info("ℹ️ No minor deviations reported in the active airspace grid.")