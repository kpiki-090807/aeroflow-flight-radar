"""Rule-based flight reading checks for a college demonstration prototype."""

import math
from numbers import Real


def _is_valid_number(value):
    """Return whether value is finite numeric data, excluding booleans."""
    return (
        isinstance(value, Real)
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _reading_warning(name, value):
    if value is None:
        return f"{name} data is missing."
    if not _is_valid_number(value):
        return f"{name} must be a finite numeric reading."
    if value < 0:
        return f"{name} value cannot be negative."
    return None


def check_flight_data(altitude, speed):
    """Check data quality for the current altitude and speed readings."""
    warnings = [
        warning
        for warning in (
            _reading_warning("Altitude", altitude),
            _reading_warning("Speed", speed),
        )
        if warning is not None
    ]
    return {
        "status": "REVIEW" if warnings else "OK",
        "warnings": warnings,
    }


def analyze_flight_observation(
    previous_altitude,
    current_altitude,
    speed,
    time_seconds,
    threshold=3000,
):
    """Return separate data-quality and flight-behavior checks."""
    data_warnings = [
        warning
        for warning in (
            _reading_warning("Previous altitude", previous_altitude),
            _reading_warning("Altitude", current_altitude),
            _reading_warning("Speed", speed),
        )
        if warning is not None
    ]

    if time_seconds is None:
        data_warnings.append("Time interval data is missing.")
    elif not _is_valid_number(time_seconds) or time_seconds <= 0:
        data_warnings.append("Time interval must be a positive finite number.")

    if not _is_valid_number(threshold) or threshold < 0:
        data_warnings.append("Threshold must be a non-negative finite number.")

    can_check_behavior = (
        _is_valid_number(previous_altitude)
        and previous_altitude >= 0
        and _is_valid_number(current_altitude)
        and current_altitude >= 0
        and _is_valid_number(time_seconds)
        and time_seconds > 0
        and _is_valid_number(threshold)
        and threshold >= 0
    )

    change = None
    behavior_warnings = []
    if can_check_behavior:
        change = current_altitude - previous_altitude
        if abs(change) > threshold:
            behavior_warnings.append(
                "Altitude change exceeds the configured demonstration threshold."
            )

    behavior_status = "NOT_EVALUATED"
    if can_check_behavior:
        behavior_status = "REVIEW" if behavior_warnings else "OK"

    data_status = "REVIEW" if data_warnings else "OK"

    result = {
        "status": "REVIEW" if data_warnings or behavior_warnings else "OK",
        "data_quality": {"status": data_status, "warnings": data_warnings},
        "flight_behavior": {
            "status": behavior_status,
            "warnings": behavior_warnings,
        },
        "details": {
            "previous_altitude": previous_altitude,
            "current_altitude": current_altitude,
            "observed_change": change,
            "time_seconds": time_seconds,
            "threshold": threshold,
        },
    }

    result["explanation"] = explain_observation(result)
    return result


def explain_altitude_change(
    previous_altitude,
    current_altitude,
    time_seconds,
    threshold=3000,
):
    """Explain the altitude rule using safe, validated arithmetic."""
    if previous_altitude is None or current_altitude is None:
        return "Altitude behavior was not evaluated because altitude data is missing."
    if (
        not _is_valid_number(previous_altitude)
        or previous_altitude < 0
        or not _is_valid_number(current_altitude)
        or current_altitude < 0
    ):
        return "Altitude behavior was not evaluated because an altitude reading is invalid."
    if not _is_valid_number(time_seconds) or time_seconds <= 0:
        return "Altitude behavior was not evaluated because the time interval is invalid."
    if not _is_valid_number(threshold) or threshold < 0:
        return "Altitude behavior was not evaluated because the threshold is invalid."

    change = current_altitude - previous_altitude
    outcome = "flagged" if abs(change) > threshold else "not flagged"
    return (
        f"Altitude change {outcome}: previous altitude {previous_altitude} feet, "
        f"current altitude {current_altitude} feet, observed change {change} feet "
        f"over {time_seconds} seconds, configured threshold {threshold} feet."
    )


def explain_observation(result):
    """Summarize why the data-quality and behavior checks did or did not flag."""
    data = result["data_quality"]
    behavior = result["flight_behavior"]
    details = result["details"]

    parts = []
    if data["warnings"]:
        parts.append("Data-quality flags: " + " ".join(data["warnings"]))
    else:
        parts.append("Data-quality check: all required readings are valid.")

    parts.append(
        explain_altitude_change(
            details["previous_altitude"],
            details["current_altitude"],
            details["time_seconds"],
            details["threshold"],
        )
    )

    if behavior["status"] == "NOT_EVALUATED":
        parts.append("Flight behavior status: NOT_EVALUATED.")
    elif behavior["warnings"]:
        parts.append("Flight-behavior flags: " + " ".join(behavior["warnings"]))
    else:
        parts.append("Flight-behavior check: no threshold rule was triggered.")

    return " ".join(parts)