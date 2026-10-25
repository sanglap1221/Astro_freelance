from __future__ import annotations
from datetime import date, datetime, timezone, timedelta, time
from zoneinfo import ZoneInfo
# pyrefly: ignore [missing-import]
import swisseph as swe

import logging

logger = logging.getLogger("astro_app.bengali_date")

BENGALI_MONTHS_EN = [
    "Boishakh", "Jyaistha", "Ashadha", "Sravana", "Bhadra", "Ashwin",
    "Kartika", "Agrahayana", "Pausa", "Magha", "Phalguna", "Chaitra"
]

BENGALI_MONTHS_BN = [
    "বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন",
    "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"
]

def get_sidereal_sun_longitude(jd_ut: float) -> float:
    """Calculate the sidereal longitude of the Sun using Lahiri ayanamsha."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    res, _ = swe.calc_ut(jd_ut, swe.SUN, flags)
    return res[0] % 360.0

def find_sun_transit(target_lon: float, jd_approx: float) -> float:
    """
    Find the exact Julian Day when the Sun's sidereal longitude crosses target_lon.
    Uses bounded search to establish a bracket, then binary search for sub-second precision.
    """
    target_lon = target_lon % 360.0

    def get_diff(jd: float) -> float:
        lon = get_sidereal_sun_longitude(jd)
        diff = (lon - target_lon + 180.0) % 360.0 - 180.0
        return diff

    jd_start = jd_approx - 2.0
    jd_end = jd_approx + 2.0
    diff_start = get_diff(jd_start)
    diff_end = get_diff(jd_end)

    bracket_found = (diff_start <= 0.0 <= diff_end)
    if not bracket_found:
        # Bounded search: shift/expand interval by estimating offset from Sun's speed (~0.9856 deg/day)
        center = jd_approx
        for _ in range(10):
            diff_center = get_diff(center)
            shift_days = -diff_center / 0.9856
            shift_days = max(-20.0, min(20.0, shift_days))
            center += shift_days
            jd_start = center - 2.0
            jd_end = center + 2.0
            diff_start = get_diff(jd_start)
            diff_end = get_diff(jd_end)
            if diff_start <= 0.0 <= diff_end:
                bracket_found = True
                break

    if not bracket_found:
        raise ValueError(
            f"Could not establish valid bracket for solar transit into {target_lon}° around JD {jd_approx} "
            f"(diff_start={diff_start}, diff_end={diff_end})."
        )

    # Sub-second precision with 40 bisection iterations
    for _ in range(40):
        jd_mid = (jd_start + jd_end) / 2.0
        diff_mid = get_diff(jd_mid)
        if diff_mid < 0:
            jd_start = jd_mid
        else:
            jd_end = jd_mid

    return (jd_start + jd_end) / 2.0

def jd_to_gregorian_date(jd_ut: float, tz: ZoneInfo | None = None) -> date:
    """Convert Julian Day UT to Gregorian date in specified timezone (defaults to Asia/Kolkata)."""
    if tz is None:
        tz = ZoneInfo("Asia/Kolkata")
    # Convert JD to calendar date in UTC
    year, month, day, hour_fraction = swe.revjul(jd_ut)
    hours = int(hour_fraction)
    minutes_fraction = (hour_fraction - hours) * 60.0
    minutes = int(minutes_fraction)
    seconds_fraction = (minutes_fraction - minutes) * 60.0
    seconds = int(seconds_fraction)
    microseconds = int((seconds_fraction - seconds) * 1_000_000)
    
    # Create datetime in UTC
    dt_utc = datetime(year, month, day, hours, minutes, seconds, microseconds, tzinfo=timezone.utc)
    # Convert to specified timezone
    dt_local = dt_utc.astimezone(tz)
    return dt_local.date()

def jd_to_gregorian_date_kolkata(jd_ut: float) -> date:
    """Convert Julian Day UT to Gregorian date in Asia/Kolkata timezone."""
    return jd_to_gregorian_date(jd_ut, ZoneInfo("Asia/Kolkata"))

def gregorian_to_bengali(
    greg_date: date,
    birth_time: time | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    timezone_name: str | None = None
) -> tuple[int, int, int, date]:
    """
    Convert a Gregorian date to Bengali solar date (Bangabda).
    If birth details are provided, calculates sunrise using Swiss Ephemeris.
    If birth is before sunrise, uses the previous day's solar date.
    Returns (year, month_index, day, effective_date) where month_index is 0-11 (Boishakh to Chaitra).
    """
    from app.astrology.calculations import validate_coordinates, get_timezone_from_coords

    effective_date = greg_date

    has_time = birth_time is not None
    has_coords = (latitude is not None or longitude is not None)
    has_tz = (timezone_name is not None and str(timezone_name).strip() != "")

    # Date-only call: no birth details supplied -> documented Kolkata default, no sunrise adjustment
    if not has_time and not has_coords and not has_tz:
        local_tz = ZoneInfo("Asia/Kolkata")
    else:
        # Partial birth details validation
        if not (has_time and latitude is not None and longitude is not None):
            raise ValueError(
                "Incomplete birth details for sunrise adjustment: birth_time, latitude, and longitude "
                "must all be provided."
            )

        flat, flon = validate_coordinates(latitude, longitude)

        if has_tz:
            candidate_tz = str(timezone_name).strip()
            try:
                local_tz = ZoneInfo(candidate_tz)
            except Exception as exc:
                raise ValueError(f"Invalid IANA timezone '{candidate_tz}': {exc}") from exc
        else:
            resolved_tz_str = get_timezone_from_coords(flat, flon)
            if resolved_tz_str:
                local_tz = ZoneInfo(resolved_tz_str)
            else:
                raise ValueError(
                    f"Unable to determine timezone for coordinates ({flat}, {flon}). "
                    "Please provide a valid IANA timezone."
                )

        # 1. Calculate birth Julian Day UT
        dt_birth = datetime.combine(greg_date, birth_time, tzinfo=local_tz)
        utc_birth = dt_birth.astimezone(timezone.utc)
        jd_birth = swe.julday(
            utc_birth.year, utc_birth.month, utc_birth.day,
            utc_birth.hour + utc_birth.minute / 60.0 + utc_birth.second / 3600.0 + utc_birth.microsecond / 3600000000.0
        )

        # 2. Calculate local midnight Julian Day UT
        dt_midnight = datetime.combine(greg_date, datetime.min.time(), tzinfo=local_tz)
        utc_midnight = dt_midnight.astimezone(timezone.utc)
        jd_midnight = swe.julday(
            utc_midnight.year, utc_midnight.month, utc_midnight.day,
            utc_midnight.hour + utc_midnight.minute / 60.0 + utc_midnight.second / 3600.0
        )

        # 3. Calculate sunrise Julian Day UT on greg_date
        geopos = [flon, flat, 0.0]
        res, tret = swe.rise_trans(
            jd_midnight,
            swe.SUN,
            swe.CALC_RISE,
            geopos,
            1010.0,  # atpress
            25.0,    # attemp
            swe.FLG_SWIEPH
        )
        if res != 0:
            raise ValueError(
                f"Sunrise calculation failed for coordinates ({flat}, {flon}) on {greg_date} (code {res}). "
                "In polar regions with 24-hour daylight or polar night, solar sunrise does not occur."
            )

        jd_sunrise = tret[0]
        if jd_birth < jd_sunrise:
            effective_date = greg_date - timedelta(days=1)

    # Rest of calculations use the effective date
    greg_date = effective_date

    # 1. Convert Gregorian date to Julian Day at local noon in local_tz
    dt_noon = datetime.combine(greg_date, datetime.min.time(), tzinfo=local_tz) + timedelta(hours=12)
    utc_noon = dt_noon.astimezone(timezone.utc)
    jd_noon = swe.julday(
        utc_noon.year, utc_noon.month, utc_noon.day,
        utc_noon.hour + utc_noon.minute / 60.0 + utc_noon.second / 3600.0
    )
    
    # 2. Find Sun's longitude and current sign index at noon
    sun_lon = get_sidereal_sun_longitude(jd_noon)
    current_sign = int(sun_lon // 30.0)
    
    # 3. Calculate transits into current and next sign
    # Transit into sign S is target longitude S * 30
    jd_transit_current = find_sun_transit(current_sign * 30.0, jd_noon - (sun_lon % 30.0))
    jd_transit_next = find_sun_transit(((current_sign + 1) % 12) * 30.0, jd_noon + (30.0 - (sun_lon % 30.0)))
    
    # 4. Determine month start Gregorian dates using the traditional midnight rule
    # A month starts on D_transit + 1
    d_transit_current = jd_to_gregorian_date(jd_transit_current, local_tz)
    d_transit_next = jd_to_gregorian_date(jd_transit_next, local_tz)
    
    start_date_current_month = d_transit_current + timedelta(days=1)
    start_date_next_month = d_transit_next + timedelta(days=1)
    
    # 5. Check which month greg_date falls in
    if greg_date >= start_date_current_month and greg_date < start_date_next_month:
        month_idx = current_sign
        first_day_of_month = start_date_current_month
    elif greg_date < start_date_current_month:
        # Falls in previous month
        month_idx = (current_sign - 1) % 12
        # Calculate transit into previous month start
        jd_transit_prev = find_sun_transit(month_idx * 30.0, jd_transit_current - 30.0)
        d_transit_prev = jd_to_gregorian_date(jd_transit_prev, local_tz)
        first_day_of_month = d_transit_prev + timedelta(days=1)
    else:
        # Falls in next month
        month_idx = (current_sign + 1) % 12
        first_day_of_month = start_date_next_month
        
    # Bengali day of the month
    bengali_day = (greg_date - first_day_of_month).days + 1
    
    # 6. Calculate Bangabda year
    # Find the start date of Baishakh (Month index 0) for this Gregorian year
    # Baishakh starts in mid-April. Let's estimate it around April 14th.
    noon_april_14 = datetime(greg_date.year, 4, 14, 12, 0, tzinfo=local_tz)
    utc_noon_april_14 = noon_april_14.astimezone(timezone.utc)
    jd_noon_april_14 = swe.julday(
        utc_noon_april_14.year, utc_noon_april_14.month, utc_noon_april_14.day,
        utc_noon_april_14.hour + utc_noon_april_14.minute / 60.0 + utc_noon_april_14.second / 3600.0
    )
    # Find transit into longitude 0
    jd_transit_zero = find_sun_transit(0.0, jd_noon_april_14)
    d_transit_zero = jd_to_gregorian_date(jd_transit_zero, local_tz)
    baishakh_start_date = d_transit_zero + timedelta(days=1)
    
    if greg_date >= baishakh_start_date:
        bangabda_year = greg_date.year - 593
    else:
        # If it is before Pohela Boishakh of year Y, the Bengali year is Y - 594
        bangabda_year = greg_date.year - 594
        
    return bangabda_year, month_idx, bengali_day, effective_date


def format_bengali_date_bn(year: int, month_idx: int, day: int) -> str:
    """Format a Bengali date in Bengali language and numerals (e.g. ২০ জ্যৈষ্ঠ ১৪৩৩)."""
    digits_map = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
    day_bn = str(day).translate(digits_map)
    year_bn = str(year).translate(digits_map)
    month_name = BENGALI_MONTHS_BN[month_idx]
    return f"{day_bn} {month_name} {year_bn}"
