import pytest
from datetime import date, time
import swisseph as swe
from app.astrology.calculations import calculate_chart, calculate_book_lagna
from app.astrology.lagna_table import get_daily_lagna_timeline, calculate_dynamic_lagna_starts, SIGN_TO_INDEX
from app.astrology.bengali_date import gregorian_to_bengali, BENGALI_MONTHS_EN


def test_calculate_book_lagna_sets_lahiri_mode():
    """Verify calculate_book_lagna explicitly sets SIDM_LAHIRI and is immune to global sidereal mode."""
    jd = 2453231.957638889  # 2004-08-13 11:00 UTC
    lat = 22.5726
    lon = 88.3639
    
    # Intentionally corrupt the global sidereal mode to Fagan-Bradley
    swe.set_sid_mode(swe.SIDM_FAGAN_BRADLEY)
    asc_after_fb = calculate_book_lagna(jd, lat, lon)
    
    # Directly set Lahiri
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    asc_expected = calculate_book_lagna(jd, lat, lon)
    
    assert abs(asc_after_fb - asc_expected) < 1e-9


def test_lagna_boundary_transitions_2024_08_12():
    """
    Test transition boundary on 2024-08-12:
    Dhanu -> Makara transition occurs between 16:32:00 and 16:33:00.
    - 16:32 returns Dhanu
    - 16:33 returns Makara
    - 16:34 returns Makara
    - Timeline displays Dhanu end as 16:32 and Makara start as 16:33
    """
    dob = date(2024, 8, 12)
    lat = 22.5726
    lon = 88.3639
    tz = "Asia/Kolkata"
    
    c32 = calculate_chart(dob, time(16, 32), "Kolkata", lat, lon, tz)
    c33 = calculate_chart(dob, time(16, 33), "Kolkata", lat, lon, tz)
    c34 = calculate_chart(dob, time(16, 34), "Kolkata", lat, lon, tz)
    
    assert c32.lagna_sign == "Dhanu", f"Expected Dhanu at 16:32, got {c32.lagna_sign}"
    assert c33.lagna_sign == "Makara", f"Expected Makara at 16:33, got {c33.lagna_sign}"
    assert c34.lagna_sign == "Makara", f"Expected Makara at 16:34, got {c34.lagna_sign}"
    
    timeline = get_daily_lagna_timeline("Sravana", 27, use_sidereal=True, dob=dob, lat=lat, lon=lon, timezone_name=tz)
    
    dhanu_item = next(item for item in timeline if item["name_en"] == "Dhanu")
    makara_item = next(item for item in timeline if item["name_en"] == "Makara")
    
    # Boundary convention: Dhanu ends at 16:32 and Makara begins at 16:33
    assert dhanu_item["end"] == "16:32", f"Dhanu displayed end should be 16:32, got {dhanu_item['end']}"
    assert makara_item["start"] == "16:33", f"Makara displayed start should be 16:33, got {makara_item['start']}"


def test_timeline_interval_consistency_with_calculate_chart():
    """
    For all signs in a day's timeline, verify that entering 'start' minute
    into calculate_chart() returns the exact sign reported in the timeline.
    """
    dob = date(2024, 8, 12)
    lat = 22.5726
    lon = 88.3639
    tz = "Asia/Kolkata"
    
    by, bm, bd, eff = gregorian_to_bengali(dob)
    month_name_en = BENGALI_MONTHS_EN[bm]
    
    timeline = get_daily_lagna_timeline(month_name_en, bd, use_sidereal=True, dob=dob, lat=lat, lon=lon, timezone_name=tz)
    assert len(timeline) >= 12
    
    for item in timeline:
        sign_name = item["name_en"]
        start_h, start_m = map(int, item["start"].split(":"))
        
        # Check start minute
        c_start = calculate_chart(dob, time(start_h, start_m), "Kolkata", lat, lon, tz)
        assert c_start.lagna_sign == sign_name, (
            f"At start minute {item['start']}, expected {sign_name} but calculate_chart gave {c_start.lagna_sign}"
        )


def test_traditional_reference_table_exact_match():
    """
    Verify that our unified calculation matches the astrologer's reference table
    (visuddha_lagna_table.json) on the exact reference dates.
    """
    from app.astrology.lagna_table import load_lagna_table
    table = load_lagna_table()
    
    # Check Phalguna 4 (2018-02-17)
    day_data = table["Phalguna"]["4"]
    ref_starts = day_data["sidereal_lagna_starts"]
    dob = date(2018, 2, 17)
    
    calc_starts = calculate_dynamic_lagna_starts(dob, 22.5726, 88.3639, is_sidereal=True)
    for sign, ref_time in ref_starts.items():
        assert calc_starts.get(sign) == ref_time, f"Mismatch for {sign}: ref={ref_time}, calc={calc_starts.get(sign)}"
