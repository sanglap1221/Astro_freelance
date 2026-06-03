from __future__ import annotations
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
# pyrefly: ignore [missing-import]
import swisseph as swe

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
    Uses binary search for high numerical precision.
    """
    jd_start = jd_approx - 2.0
    jd_end = jd_approx + 2.0
    
    def get_diff(jd: float) -> float:
        lon = get_sidereal_sun_longitude(jd)
        diff = (lon - target_lon + 180.0) % 360.0 - 180.0
        return diff

    diff_start = get_diff(jd_start)
    diff_end = get_diff(jd_end)
    
    # Expand search window if transit is outside [jd_start, jd_end]
    for _ in range(5):
        if diff_start <= 0 <= diff_end:
            break
        if diff_start > 0:
            # Transit was earlier
            jd_start -= 2.0
            jd_end -= 2.0
        else:
            # Transit is later
            jd_start += 2.0
            jd_end += 2.0
        diff_start = get_diff(jd_start)
        diff_end = get_diff(jd_end)
        
    # Binary search for root
    for _ in range(30):
        jd_mid = (jd_start + jd_end) / 2.0
        diff_mid = get_diff(jd_mid)
        if diff_mid < 0:
            jd_start = jd_mid
        else:
            jd_end = jd_mid
            
    return (jd_start + jd_end) / 2.0

def jd_to_gregorian_date_kolkata(jd_ut: float) -> date:
    """Convert Julian Day UT to Gregorian date in Asia/Kolkata timezone."""
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
    # Convert to Kolkata timezone
    dt_kolkata = dt_utc.astimezone(ZoneInfo("Asia/Kolkata"))
    return dt_kolkata.date()

def gregorian_to_bengali(greg_date: date) -> tuple[int, int, int]:
    """
    Convert a Gregorian date to Bengali solar date (Bangabda).
    Returns (year, month_index, day) where month_index is 0-11 (Boishakh to Chaitra).
    """
    # 1. Convert Gregorian date to Julian Day at local noon (Kolkata)
    dt_noon = datetime.combine(greg_date, datetime.min.time(), tzinfo=ZoneInfo("Asia/Kolkata")) + timedelta(hours=12)
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
    d_transit_current = jd_to_gregorian_date_kolkata(jd_transit_current)
    d_transit_next = jd_to_gregorian_date_kolkata(jd_transit_next)
    
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
        d_transit_prev = jd_to_gregorian_date_kolkata(jd_transit_prev)
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
    noon_april_14 = datetime(greg_date.year, 4, 14, 12, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
    utc_noon_april_14 = noon_april_14.astimezone(timezone.utc)
    jd_noon_april_14 = swe.julday(
        utc_noon_april_14.year, utc_noon_april_14.month, utc_noon_april_14.day,
        utc_noon_april_14.hour + utc_noon_april_14.minute / 60.0 + utc_noon_april_14.second / 3600.0
    )
    # Find transit into longitude 0
    jd_transit_zero = find_sun_transit(0.0, jd_noon_april_14)
    d_transit_zero = jd_to_gregorian_date_kolkata(jd_transit_zero)
    baishakh_start_date = d_transit_zero + timedelta(days=1)
    
    if greg_date >= baishakh_start_date:
        bangabda_year = greg_date.year - 593
    else:
        # If it is before Pohela Boishakh of year Y, the Bengali year is Y - 594
        bangabda_year = greg_date.year - 594
        
    return bangabda_year, month_idx, bengali_day

def format_bengali_date_bn(year: int, month_idx: int, day: int) -> str:
    """Format a Bengali date in Bengali language and numerals (e.g. ২০ জ্যৈষ্ঠ ১৪৩৩)."""
    digits_map = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
    day_bn = str(day).translate(digits_map)
    year_bn = str(year).translate(digits_map)
    month_name = BENGALI_MONTHS_BN[month_idx]
    return f"{day_bn} {month_name} {year_bn}"
