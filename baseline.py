# baseline.py - Flight DNA Engine

def calculate_baseline(altitude_m, velocity_ms, vertical_rate_ms):
    """
    Computes expected baseline telemetry thresholds ('Flight DNA').
    Returns a dictionary of expected limits and current status.
    """
    if altitude_m and altitude_m > 9000:
        expected_min_speed = 180.0
        expected_max_speed = 280.0
        expected_max_vrate = 15.0
    else:
        expected_min_speed = 80.0
        expected_max_speed = 220.0
        expected_max_vrate = 25.0

    is_speed_normal = expected_min_speed <= velocity_ms <= expected_max_speed if velocity_ms else True
    is_vrate_normal = abs(vertical_rate_ms) <= expected_max_vrate if vertical_rate_ms else True

    return {
        "expected_min_speed": expected_min_speed,
        "expected_max_speed": expected_max_speed,
        "is_speed_normal": is_speed_normal,
        "is_vrate_normal": is_vrate_normal,
        "baseline_status": "NORMAL" if (is_speed_normal and is_vrate_normal) else "DEVIATION_DETECTED"
    }
