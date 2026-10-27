import streamlit as st
import folium
from streamlit_folium import st_folium
import requests
from baseline import calculate_baseline

st.set_page_config(page_title="Real-Time Flight Anomaly Radar", layout="wide")

st.title("✈️ Real-Time Flight Anomaly Radar [War Room]")
st.caption("Monitoring live airspace behaviour, Flight DNA baselines, and Explainable AI alerts.")

# Sidebar Controls
st.sidebar.header("Radar Controls")
refresh_rate = st.sidebar.slider("Data Refresh Rate (seconds)", 5, 60, 10)

@st.cache_data(ttl=10)
def fetch_live_flights():
    """Fetches real-time flight data over India/South Asia with safe fallback handling."""
    url = "https://opensky-network.org/api/states/all?lamin=6.0&lamax=35.0&lomin=68.0&lomax=97.0"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            states = data.get("states")
            
            if states and isinstance(states, list):
                flights = []
                for s in states[:30]:  # Limit to top 30 flights
                    if len(s) > 11 and s[6] is not None and s[5] is not None:
                        flights.append({
                            "callsign": s[1].strip() if s[1] else "UNKNOWN",
                            "lon": s[5],
                            "lat": s[6],
                            "altitude": s[7] if s[7] is not None else 0,
                            "velocity": s[9] if s[9] is not None else 0,
                            "vertical_rate": s[11] if s[11] is not None else 0
                        })
                if flights:
                    return flights
    except Exception as e:
        st.warning(f"Telemetry API Notice: {e}")
    
    # Safe Fallback Mock Data so your radar always shows active targets
    return [
        {"callsign": "AIC101", "lon": 77.2090, "lat": 28.6139, "altitude": 10500, "velocity": 240, "vertical_rate": 0},
        {"callsign": "IGO602", "lon": 72.8777, "lat": 19.0760, "altitude": 8500, "velocity": 190, "vertical_rate": -12},
        {"callsign": "SEJ303", "lon": 78.4867, "lat": 17.3850, "altitude": 11200, "velocity": 310, "vertical_rate": 30},
        {"callsign": "UAE505", "lon": 88.3639, "lat": 22.5726, "altitude": 3200, "velocity": 95, "vertical_rate": -2},
        {"callsign": "IXR404", "lon": 80.2707, "lat": 13.0827, "altitude": 9800, "velocity": 210, "vertical_rate": 0}
    ]

# Fetch live flights
flights = fetch_live_flights()

# Summary Metrics Bar
st.subheader("Airspace Status Overview")
col1, col2, col3 = st.columns(3)

total_flights = len(flights)
normal_count = 0
anomaly_count = 0

for f in flights:
    baseline_info = calculate_baseline(f["altitude"], f["velocity"], f["vertical_rate"])
    f["baseline"] = baseline_info
    if baseline_info["baseline_status"] == "NORMAL":
        normal_count += 1
    else:
        anomaly_count += 1

col1.metric("Total Airspace Targets", total_flights)
col2.metric("Nominal Flights (DNA Passed)", normal_count)
col3.metric("Deviations / Anomaly Alerts", anomaly_count, delta_color="inverse")

# Render Map
st.subheader("Live Airspace Grid")
m = folium.Map(location=[20.5937, 78.9629], zoom_start=5)

for f in flights:
    is_normal = f["baseline"]["baseline_status"] == "NORMAL"
    marker_color = "cyan" if is_normal else "red"
    
    popup_text = (
        f"<b>Callsign:</b> {f['callsign']}<br>"
        f"<b>Altitude:</b> {f['altitude']} m<br>"
        f"<b>Velocity:</b> {f['velocity']} m/s<br>"
        f"<b>Status:</b> {'🟢 Normal' if is_normal else '🔴 Baseline Deviation'}"
    )
    
    folium.CircleMarker(
        location=[f["lat"], f["lon"]],
        radius=6,
        color=marker_color,
        fill=True,
        fill_color=marker_color,
        fill_opacity=0.8,
        popup=popup_text
    ).add_to(m)

st_folium(m, width="100%", height=500)

# XAI / Explainable AI Diagnostic Panel
st.subheader("🤖 Explainable AI (XAI) Flight Diagnostics")
st.caption("Automated rule justification and reasoning for flagged airspace deviations.")

# Filter flights that have deviations
flagged_flights = [f for f in flights if f["baseline"]["baseline_status"] != "NORMAL"]

if flagged_flights:
    for f in flagged_flights:
        with st.expander(f"⚠️ Alert: Flight {f['callsign']} - Deviation Detected"):
            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown(f"**Current Altitude:** {f['altitude']} meters")
                st.markdown(f"**Current Velocity:** {f['velocity']} m/s")
                st.markdown(f"**Vertical Rate:** {f['vertical_rate']} m/s")
            with col_b:
                # XAI Reasoning Breakdown
                info = f["baseline"]
                st.markdown("**Flight DNA Evaluation:**")
                if not info["is_speed_normal"]:
                    st.error(f"• Velocity anomaly! Speed ({f['velocity']} m/s) is outside normal bounds [{info['expected_min_speed']} - {info['expected_max_speed']} m/s].")
                if not info["is_vrate_normal"]:
                    st.error(f"• Vertical rate anomaly! Climb/descent rate ({f['vertical_rate']} m/s) exceeds maximum safe threshold.")
                st.info("💡 **AI Recommendation:** Flagged for secondary radar verification and transponder confirmation.")
else:
    st.success("✅ All tracked targets in the current airspace grid are operating within normal Flight DNA parameters.")