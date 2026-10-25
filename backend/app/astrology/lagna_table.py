from __future__ import annotations
import json
from datetime import time, date, datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path

# Static mapping from sign name to index
SIGN_TO_INDEX = {
    "Mesha": 0, "Vrishabha": 1, "Mithuna": 2, "Karka": 3,
    "Simha": 4, "Kanya": 5, "Tula": 6, "Vrischika": 7,
    "Dhanu": 8, "Makara": 9, "Kumbha": 10, "Meena": 11
}

def load_lagna_table() -> dict:
    """Load and merge PM Bagchi and Visuddha lagna table data."""
    merged = {}
    
    # Load Visuddha lagna table as base
    v_path = Path(__file__).resolve().parent / "data" / "traditional_rules" / "visuddha_lagna_table.json"
    if v_path.exists():
        with open(v_path, "r", encoding="utf-8") as f:
            try:
                merged = json.load(f)
            except Exception:
                merged = {}
                
    # Merge PM Bagchi lagna table (giving it precedence)
    # p_path = Path(__file__).resolve().parent / "data" / "traditional_rules" / "pm_bagchi_lagna_table.json"
    # if p_path.exists():
    #     with open(p_path, "r", encoding="utf-8") as f:
    #         try:
    #             pm_data = json.load(f)
    #             for month, days in pm_data.items():
    #                 if month not in merged:
    #                     merged[month] = {}
    #                 for day, day_data in days.items():
    #                     merged[month][day] = day_data
    #         except Exception:
    #             pass
                
    return merged

def lookup_table_lagna(month_name: str, day_num: int, birth_time: time, use_sidereal: bool = True) -> int:
    """
    Look up the active Lagna sign index from the table.
    
    Args:
        month_name:   Bengali month name in English (e.g. 'Phalguna')
        day_num:      Bengali day number (e.g. 4)
        birth_time:   Time object representing birth time
        use_sidereal: If True, use sidereal start times; else tropical.
        
    Returns:
        Sign index (0 to 11) of the active Lagna.
    """
    table = load_lagna_table()
    
    # Check if month and day exist in table
    month_data = table.get(month_name)
    if not month_data:
        raise ValueError(f"Month '{month_name}' not found in lagna table.")
        
    day_data = month_data.get(str(day_num))
    if not day_data:
        raise ValueError(f"Day '{day_num}' not found for month '{month_name}' in lagna table.")
        
    # Get the appropriate starts dictionary
    starts_dict = day_data.get("sidereal_lagna_starts" if use_sidereal else "tropical_lagna_starts")
    if not starts_dict:
        raise ValueError(f"Lagna starts not found in table for {month_name} {day_num}.")
        
    # Convert birth time to minutes from midnight
    birth_minutes = birth_time.hour * 60 + birth_time.minute
    
    # Parse table start times into minutes from midnight
    timeline = []
    for sign_name, start_time_str in starts_dict.items():
        h, m = map(int, start_time_str.split()[0].split(":"))
        start_minutes = h * 60 + m
        sign_idx = SIGN_TO_INDEX[sign_name]
        timeline.append((start_minutes, sign_idx, sign_name))
        
    # Sort chronologically by start time
    timeline.sort(key=lambda x: x[0])
    
    # Find active lagna
    active_sign_idx = None
    
    # Search for the largest start time <= birth_minutes
    for start_min, sign_idx, name in timeline:
        if start_min <= birth_minutes:
            active_sign_idx = sign_idx
            
    # If birth time is before the earliest start time of the current day,
    # look up the last active sign from the PREVIOUS day's schedule.
    if active_sign_idx is None:
        prev_day_num = day_num - 1
        prev_month = month_name
        if prev_day_num < 1:
            # Rolled past the 1st — resolve to the previous month's final day.
            # Bengali month order for rollback lookup:
            _MONTH_ORDER = [
                "Baishakh", "Jyaistha", "Ashadh", "Shravan",
                "Bhadra", "Ashwin", "Kartik", "Agrahayana",
                "Paush", "Magh", "Phalguna", "Chaitra",
            ]
            try:
                cur_idx = _MONTH_ORDER.index(month_name)
                prev_month = _MONTH_ORDER[(cur_idx - 1) % 12]
            except ValueError:
                prev_month = month_name  # fallback if name not in list
            # Find the highest day number available for the previous month
            prev_month_data = table.get(prev_month, {})
            if prev_month_data:
                prev_day_num = max(int(k) for k in prev_month_data.keys() if k.isdigit())
            else:
                # Cannot resolve — fall back to last sign of current day as last resort
                return timeline[-1][1]

        prev_day_data = table.get(prev_month, {}).get(str(prev_day_num))
        if prev_day_data:
            prev_starts = prev_day_data.get(
                "sidereal_lagna_starts" if use_sidereal else "tropical_lagna_starts"
            )
            if prev_starts:
                def _parse_min(t_str: str) -> int:
                    hh, mm = map(int, t_str.split()[0].split(":"))
                    return hh * 60 + mm
                prev_timeline = sorted(
                    [(_parse_min(v), SIGN_TO_INDEX[k]) for k, v in prev_starts.items()]
                )
                active_sign_idx = prev_timeline[-1][1]

        # Ultimate fallback if previous day data is unavailable
        if active_sign_idx is None:
            active_sign_idx = timeline[-1][1]
        
    return active_sign_idx


def subtract_one_minute(t_str: str) -> str:
    """Subtract one minute from HH:MM string, wrapping across midnight and preserving any offset suffix."""
    parts = t_str.strip().split()
    time_part = parts[0]
    suffix = (" " + " ".join(parts[1:])) if len(parts) > 1 else ""
    h, m = map(int, time_part.split(":"))
    total_m = (h * 60 + m - 1) % (24 * 60)
    return f"{total_m // 60:02d}:{total_m % 60:02d}{suffix}"


def _timeline_sort_key(t_str: str) -> float:
    """Sort key that accurately orders times chronologically across the day, including UTC offset suffixes."""
    parts = t_str.strip().split()
    hh, mm = map(int, parts[0].split(":"))
    if len(parts) > 1:
        off_part = parts[1].strip("()")
        if off_part.startswith("+") or off_part.startswith("-"):
            sign = -1 if off_part.startswith("-") else 1
            raw_off = off_part.lstrip("+-")
            off_h = int(raw_off[:2])
            off_m = int(raw_off[2:]) if len(raw_off) > 2 else 0
            offset_minutes = sign * (off_h * 60 + off_m)
            return (hh * 60 + mm) - offset_minutes
    return hh * 60 + mm


def calculate_dynamic_lagna_starts(
    dob: date, 
    lat: float, 
    lon: float, 
    is_sidereal: bool = True,
    timezone_name: Optional[str] = None
) -> dict[str, str]:
    """
    Calculate the starting time (HH:MM) of each Lagna sign during the day.
    Uses unified calculate_book_lagna() for sidereal mode to strictly match calculate_chart(),
    iterating through actual UTC instants spanning the local calendar day,
    and performs numerical search (bisection) to accurately locate sign boundaries.
    """
    # pyrefly: ignore [missing-import]
    import swisseph as swe
    from zoneinfo import ZoneInfo
    from datetime import datetime, timedelta
    from app.astrology.calculations import ZODIAC_SIGNS, calculate_book_lagna, _sign_index, get_timezone_from_coords
    
    tz = None
    if timezone_name and str(timezone_name).strip():
        candidate_tz = str(timezone_name).strip()
        try:
            tz = ZoneInfo(candidate_tz)
        except Exception as exc:
            raise ValueError(f"Invalid IANA timezone '{candidate_tz}': {exc}") from exc
            
    if tz is None:
        resolved_tz_str = get_timezone_from_coords(lat, lon)
        if resolved_tz_str:
            tz = ZoneInfo(resolved_tz_str)
        else:
            raise ValueError(
                f"Unable to determine timezone for coordinates ({lat}, {lon}). "
                "Please provide a valid IANA timezone."
            )
        
    local_start = datetime.combine(dob, datetime.min.time(), tzinfo=tz)
    local_end = datetime.combine(dob + timedelta(days=1), datetime.min.time(), tzinfo=tz)
    utc_start = local_start.astimezone(ZoneInfo("UTC"))
    utc_end = local_end.astimezone(ZoneInfo("UTC"))
    total_minutes = int(round((utc_end - utc_start).total_seconds() / 60.0))
    is_autumn_25h = (total_minutes > 1440)
    
    def _calc_asc(u_dt: datetime) -> float:
        jd = swe.julday(
            u_dt.year, u_dt.month, u_dt.day,
            u_dt.hour + u_dt.minute / 60.0 + u_dt.second / 3600.0 + u_dt.microsecond / 3600000000.0
        )
        if is_sidereal:
            return calculate_book_lagna(jd, lat, lon)
        else:
            cusps, ascmc = swe.houses(jd, lat, lon, b'P')
            return ascmc[0] % 360.0

    # 1. Evaluate sign at each whole minute of the day across UTC instants
    minute_signs = []
    for m in range(total_minutes):
        u_dt = utc_start + timedelta(minutes=m)
        asc_lon = _calc_asc(u_dt)
        minute_signs.append(_sign_index(asc_lon))

    # 2. Identify sign transitions and refine exact boundary
    lagna_starts = {}
    for m in range(total_minutes):
        prev_m = (m - 1) % total_minutes
        curr_s = minute_signs[m]
        prev_s = minute_signs[prev_m]
        if curr_s != prev_s:
            # Transition occurred between (m-1) and m in UTC
            u_prev = utc_start + timedelta(minutes=prev_m if m > 0 else -1)
            target_cusp = float(curr_s * 30.0)
            low_sec = 0.0
            high_sec = 60.0
            for _ in range(20):
                mid_sec = (low_sec + high_sec) / 2.0
                u_mid = u_prev + timedelta(seconds=mid_sec)
                mid_asc = _calc_asc(u_mid)
                diff = (mid_asc - target_cusp + 180.0) % 360.0 - 180.0
                if diff < 0:
                    low_sec = mid_sec
                else:
                    high_sec = mid_sec

            # Minute m is the first integer minute returning curr_s in calculate_chart()
            u_curr = utc_start + timedelta(minutes=m)
            local_curr = u_curr.astimezone(tz)
            base_time = local_curr.strftime("%H:%M")
            alt = local_curr.replace(fold=1 - local_curr.fold)
            is_ambiguous = (local_curr.astimezone(ZoneInfo("UTC")) != alt.astimezone(ZoneInfo("UTC")))
            if is_ambiguous:
                time_label = f"{base_time} ({local_curr.strftime('%z')})"
            else:
                time_label = base_time

            sign_name = ZODIAC_SIGNS[curr_s]
            lagna_starts[sign_name] = time_label
            
    return lagna_starts


def get_daily_lagna_timeline(
    month_name: str,
    day_num: int,
    use_sidereal: bool = True,
    dob: Optional[date] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    timezone_name: Optional[str] = None,
    place: Optional[str] = None,
) -> list[dict]:
    """
    Returns the daily Lagna timeline with consistent, non-overlapping intervals.
    Uses unified calculate_book_lagna sidereal calculation matching calculate_chart().
    Each sign's interval [start, end] is constructed so that any minute in that range
    consistently returns that sign when evaluated by calculate_chart().
    """
    from app.astrology.bengali_date import BENGALI_MONTHS_EN
    from app.astrology.calculations import resolve_location, get_timezone_from_coords
    
    starts_dict = {}
    resolved_lat = None
    resolved_lon = None
    resolved_tz = None
    
    # When dob is provided, compute dynamically using the exact coordinates
    # to guarantee 100% chart and timeline alignment for that date.
    if dob is not None:
        if lat is not None and lon is not None:
            resolved_lat = float(lat)
            resolved_lon = float(lon)
            if timezone_name and str(timezone_name).strip():
                candidate_tz = str(timezone_name).strip()
                try:
                    ZoneInfo(candidate_tz)
                    resolved_tz = candidate_tz
                except Exception as exc:
                    raise ValueError(f"Invalid IANA timezone '{candidate_tz}': {exc}") from exc
            else:
                resolved_tz = get_timezone_from_coords(resolved_lat, resolved_lon)
                if not resolved_tz:
                    raise ValueError(
                        f"Unable to determine timezone for coordinates ({resolved_lat}, {resolved_lon}). "
                        "Please provide a valid IANA timezone."
                    )
        elif place and str(place).strip():
            loc = resolve_location(place=place, lat=lat, lon=lon, tz=timezone_name)
            resolved_lat = loc.latitude
            resolved_lon = loc.longitude
            resolved_tz = loc.timezone
        else:
            raise ValueError(
                "Latitude and longitude (or a specific place) must be explicitly provided "
                "when computing daily lagna timeline for a birth date. "
                "Silent fallback to Kolkata coordinates is prohibited."
            )

        starts_dict = calculate_dynamic_lagna_starts(
            dob, resolved_lat, resolved_lon, use_sidereal, resolved_tz
        )
    else:
        # Fall back to static table if no dob provided (reference table for Kolkata)
        table = load_lagna_table()
        month_data = table.get(month_name, {})
        day_data = month_data.get(str(day_num), {})
        starts_dict = day_data.get("sidereal_lagna_starts" if use_sidereal else "tropical_lagna_starts", {})
        
    if not starts_dict:
        return []
        
    timeline = []
    for sign_name, start_time_str in starts_dict.items():
        timeline.append({
            "name_en": sign_name,
            "start": start_time_str
        })
        
    timeline.sort(key=lambda x: _timeline_sort_key(x["start"]))
    
    # Compute duration intervals seamlessly:
    # A sign that runs until the next sign starts at T ends at T - 1 minute.
    # This guarantees that entering any minute within [start, end] returns this sign.
    for i in range(len(timeline)):
        if i < len(timeline) - 1:
            timeline[i]["end"] = subtract_one_minute(timeline[i+1]["start"])
        else:
            # Wrap around to the start of the next day
            next_starts = {}
            if dob is not None and resolved_lat is not None and resolved_lon is not None:
                from datetime import timedelta
                next_starts = calculate_dynamic_lagna_starts(
                    dob + timedelta(days=1), resolved_lat, resolved_lon, use_sidereal, resolved_tz
                )
            else:
                table = load_lagna_table()
                month_data = table.get(month_name, {})
                next_day_num = day_num + 1
                next_day_data = month_data.get(str(next_day_num))
                if not next_day_data:
                    try:
                        cur_idx = BENGALI_MONTHS_EN.index(month_name)
                        next_month = BENGALI_MONTHS_EN[(cur_idx + 1) % 12]
                        next_day_data = table.get(next_month, {}).get("1", {})
                    except Exception:
                        pass
                if next_day_data:
                    next_starts = next_day_data.get("sidereal_lagna_starts" if use_sidereal else "tropical_lagna_starts", {})
            
            if next_starts:
                next_sorted = sorted(next_starts.items(), key=lambda x: _timeline_sort_key(x[1]))
                timeline[i]["end"] = subtract_one_minute(next_sorted[0][1])
            else:
                timeline[i]["end"] = subtract_one_minute(timeline[0]["start"])
                
    return timeline


