import streamlit as st
import folium
from streamlit_folium import st_folium
import math

# 1. Imports from teammate modules
from simulator import get_simulated_flights
from member2_shield_ai import analyze_flight_observation, explain_observation

# Page Configuration
st.set_page_config(
    page_title="Real-Time Flight Anomaly Radar",
    page_icon="✈️",
    layout="wide"
)

# --- CUSTOM COLOR SCHEME STYLING ---
# Primary Background: Deep Navy (#0b1020)
# Card Surface: Slate Blue (#1c2a44)
# Text & Data: Icy Off-White (#e9eef6)
# Primary Accent / Warnings: Warm Gold / Amber (#c9a46a)
st.markdown("""
    <style>
    /* Primary Background */
    .stApp {
        background-color: #0b1020;
        color: #e9eef6;
    }
    
    /* Global Text & Headers */
    h1, h2, h3, h4, h5, h6, label, p, span, div {
        color: #e9eef6 !important;
    }
    
    /* Secondary / Card Surface */
    div[data-testid="stMetric"], div.streamlit-expanderHeader {
        background-color: #1c2a44 !important;
        border: 1px solid #7aa6c2 !important;
        border-radius: 8px !important;
        padding: 10px !important;
    }
    
    /* Expander Content Container */
    div[data-testid="stExpander"] {
        background-color: #1c2a44 !important;
        border-radius: 8px !important;
        margin-bottom: 8px !important;
    }

    /* Primary Accent / Call-to-Action Highlights */
    .stButton>button, div[data-baseweb="select"] {
        border-color: #c9a46a !important;
    }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #1c2a44 !important;
        border-right: 1px solid #7aa6c2 !important;
    }
    </style>
""", unsafe_allow_html=True)


# Helper function to derive flight metrics
def derive_flight_metrics(altitude, vertical_rate, velocity):
    """
    Derives flight phase, estimated distance, and estimated duration.
    """
    if altitude < 1000 and abs(vertical_rate) < 2.0:
        phase = "Taxiing / On Ground"
    elif vertical_rate > 2.0:
        phase = "Taking Off / Climbing"
    elif vertical_rate < -2.0:
        phase = "Landing / Desceding"
    else:
        phase = "Cruising"

    est_distance_km = round(max(50.0, (altitude / 10.0) + (velocity * 0.5)), 1)
    if velocity > 0:
        est_duration_mins = round((est_distance_km / (velocity * 3.6)) * 60)
    else:
        est_duration_mins = 0

    return phase, est_distance_km, est_duration_mins


# --- SIDEBAR CONTROLS ---
st.sidebar.title("🛰️ Radar Controls")
st.sidebar.markdown("---")

telemetry_source = st.sidebar.radio(
    "Telemetry Source",
    options=["Live OpenSky Feed", "Synthetic Anomaly Simulator"],
    index=1
)

anomaly_scenario = "None"
if telemetry_source == "Synthetic Anomaly Simulator":
    anomaly_scenario = st.sidebar.selectbox(
        "Inject Anomaly Scenario",
        options=["None", "Altitude Drop", "Speed Burst", "Vertical Rate Spike"]
    )

st.sidebar.markdown("---")
st.sidebar.info("System Status: **Operational**\n\nFalse Alarm Shield: **Active**")


# --- DATA FETCHING & ANALYSIS ---
raw_flights = get_simulated_flights(anomaly_scenario)
processed_flights = []

total_targets = len(raw_flights)
flagged_count = 0

for f in raw_flights:
    prev_alt = max(0.0, f["altitude"] - (f.get("vertical_rate", 0.0) * 10))
    
    shield_result = analyze_flight_observation(
        previous_altitude=prev_alt,
        current_altitude=f["altitude"],
        speed=f["velocity"],
        time_seconds=10.0,
        threshold=3000.0
    )
    
    phase, dist_km, duration_mins = derive_flight_metrics(
        f["altitude"], 
        f.get("vertical_rate", 0.0), 
        f["velocity"]
    )
    
    is_flagged = shield_result["status"] == "REVIEW"
    if is_flagged:
        flagged_count += 1
        
    processed_flight = {
        **f,
        "phase": phase,
        "dist_km": dist_km,
        "duration_mins": duration_mins,
        "shield": shield_result,
        "is_flagged": is_flagged
    }
    processed_flights.append(processed_flight)

normal_count = total_targets - flagged_count


# --- MAIN DASHBOARD HEADER ---
st.title("🛰️ Real-Time Flight Anomaly Radar")
st.caption("War Room Airspace Surveillance & Aerodynamic Flight DNA Diagnostics")
st.markdown("---")


# --- SIDE-BY-SIDE WAR ROOM LAYOUT ---
col_map, col_info = st.columns([1, 1])

# LEFT COLUMN: Bright Square Airspace Map
with col_map:
    st.subheader("🗺️ Airspace Radar")
    
    # Map initialized with bright OpenStreetMap tiles
    m = folium.Map(
        location=[17.3850, 78.4867], 
        zoom_start=6, 
        tiles="OpenStreetMap"
    )

    for f in processed_flights:
        marker_color = "red" if f["is_flagged"] else "blue"
        popup_text = f"<b>{f['callsign']}</b><br>Alt: {f['altitude']} ft<br>Speed: {f['velocity']} kts"
        
        folium.Marker(
            location=[f["latitude"], f["longitude"]],
            popup=folium.Popup(popup_text, max_width=200),
            tooltip=f"{f['callsign']} ({f['phase']})",
            icon=folium.Icon(color=marker_color, icon="plane", prefix="fa")
        ).add_to(m)

    # Render map in a clean square shape
    st_folium(m, width="100%", height=520)

# RIGHT COLUMN: Metrics & Diagnostic Feed
with col_info:
    st.subheader("🔍 Diagnostics & Flight Info")
    
    # Overview Metrics
    ic1, ic2, ic3 = st.columns(3)
    ic1.metric("Tracked Targets", total_targets)
    ic2.metric("Nominal", normal_count)
    ic3.metric("Flagged Deviations", flagged_count)
    
    st.markdown("##### ✈️ Live Diagnostic Feed")
    
    # Flight Cards List
    for f in processed_flights:
        status_icon = "🔴" if f["is_flagged"] else "🟢"
        with st.expander(f"{status_icon} {f['callsign']} - {f['phase']}"):
            st.write(f"**Altitude:** {f['altitude']} ft | **Velocity:** {f['velocity']} kts")
            st.write(f"**Est. Distance:** {f['dist_km']} km | **En Route:** ~{f['duration_mins']} mins")
            
            shield = f["shield"]
            if f["is_flagged"]:
                st.error(f"⚠️ **Shield Status:** {shield['status']}")
            else:
                st.success("✅ **Shield Status:** OK")
                
            st.caption(f"📝 **XAI Explanation:** {shield['explanation']}")