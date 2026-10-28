# baseline.py - Aerodynamically Correct Flight DNA Baseline Engine

def calculate_baseline(altitude, velocity, vertical_rate):
    """
    Evaluates telemetry against realistic aviation operational baselines,
    accounting for ground operations, stall limits, and asymmetric climb/descent physics.
    """
    status = "NORMAL"
    is_speed_normal = True
    is_vrate_normal = True
    severity = "LOW"
    
    # 0. Ground / Runway / Low-Roll Phase Check
    # If altitude is near zero, aircraft is taxiing, taking off, or landing. Skip flight anomalies.
    if altitude < 50:
        return {
            "baseline_status": "NORMAL",
            "severity": "LOW",
            "is_speed_normal": True,
            "is_vrate_normal": True,
            "expected_min_speed": 0.0,
            "expected_max_speed": 100.0,
            "max_safe_vrate": 10.0
        }

    # 1. High Altitude Cruising Regime (> 8000 meters)
    if altitude > 8000:
        expected_min_speed, expected_max_speed = 190.0, 310.0
        max_upward_vrate = 15.0    # Thin air makes high climbs aerodynamically impossible/anomalous
        max_downward_vrate = -35.0 # Emergency rapid descents can reach negative bounds safely
    # 2. Intermediate Transition Regime (3000m - 8000m)
    elif altitude > 3000:
        expected_min_speed, expected_max_speed = 120.0, 260.0
        max_upward_vrate = 25.0
        max_downward_vrate = -30.0
    # 3. Low Altitude / Approach Regime (50m - 3000 meters)
    else:
        expected_min_speed, expected_max_speed = 50.0, 180.0
        max_upward_vrate = 30.0
        max_downward_vrate = -35.0

    # Speed Checks (Stall vs Overspeed)
    if velocity < expected_min_speed:
        is_speed_normal = False
        status = "DEVIATION"
        severity = "CRITICAL"  # Unsafe stall speed for altitude!
    elif velocity > expected_max_speed:
        is_speed_normal = False
        status = "DEVIATION"
        severity = "WARNING" if (velocity - expected_max_speed) < 40 else "CRITICAL"

    # Asymmetric Vertical Rate Checks
    # Check if climbing too fast for the air density, or descending past safe structural limits
    if vertical_rate > max_upward_vrate or vertical_rate < max_downward_vrate:
        is_vrate_normal = False
        status = "DEVIATION"
        severity = "CRITICAL"

    return {
        "baseline_status": status,
        "severity": severity,
        "is_speed_normal": is_speed_normal,
        "is_vrate_normal": is_vrate_normal,
        "expected_min_speed": expected_min_speed,
        "expected_max_speed": expected_max_speed,
        "max_safe_vrate": max(abs(max_upward_vrate), abs(max_downward_vrate))
    }
