"""
Regression tests for Vimshottari Antardasha calculations.
Tests:
1. 2004 birth (Case B)
2. 2024 birth
3. 2025 birth
4. 2026 birth (Case A)
5. Birth on day 31
6. Leap-year February 29
7. First Mahadasha with high remaining balance
8. First Mahadasha with low remaining balance
9. Full later Mahadasha
"""
import pytest
from datetime import date, time
from app.astrology.calculations import (
    calculate_chart,
    _calc_dasha,
    _calc_antardasha,
    add_calendar_ymd,
    _days_to_ymd,
    DASHA_SEQUENCE,
    DASHA_YEARS,
)


def _verify_chart_invariants(res, label=""):
    """Verify all invariant rules across all Mahadashas and Antardashas."""
    for md in res.mahadasha_list:
        # Every AD start <= end
        for ad in md.antardashas:
            assert ad.start_date <= ad.end_date, (
                f"{label} {md.planet}: AD {ad.planet} start ({ad.start_date}) > end ({ad.end_date})"
            )

        # Every adjacent pair is contiguous
        for i in range(len(md.antardashas) - 1):
            assert md.antardashas[i].end_date == md.antardashas[i + 1].start_date, (
                f"{label} {md.planet}: gap/overlap between {md.antardashas[i].planet} "
                f"({md.antardashas[i].end_date}) and {md.antardashas[i + 1].planet} ({md.antardashas[i + 1].start_date})"
            )

        # Final AD end matches MD end
        assert md.antardashas[-1].end_date == md.end_date, (
            f"{label} {md.planet}: final AD {md.antardashas[-1].planet} end ({md.antardashas[-1].end_date}) "
            f"!= MD end ({md.end_date})"
        )

    # Verify current antardashas list (exactly 9 periods, no gaps)
    assert len(res.current_antardashas) == 9, f"{label}: current_antardashas count != 9"
    for i in range(len(res.current_antardashas) - 1):
        assert res.current_antardashas[i]["end_date"] == res.current_antardashas[i + 1]["start_date"], (
            f"{label}: gap in current_antardashas between index {i} and {i + 1}"
        )


# =====================================================================
# add_calendar_ymd edge cases
# =====================================================================
class TestAddCalendarYmd:
    def test_identity_jan31(self):
        assert add_calendar_ymd(date(2024, 1, 31), 0, 0, 0) == date(2024, 1, 31)

    def test_identity_mar31(self):
        assert add_calendar_ymd(date(2024, 3, 31), 0, 0, 0) == date(2024, 3, 31)

    def test_identity_aug31(self):
        assert add_calendar_ymd(date(2024, 8, 31), 0, 0, 0) == date(2024, 8, 31)

    def test_ketu_md_end(self):
        assert add_calendar_ymd(date(2026, 8, 13), 4, 4, 0) == date(2030, 12, 13)


# =====================================================================
# _days_to_ymd edge cases
# =====================================================================
class TestDaysToYmd:
    def test_negative_input(self):
        y, m, d = _days_to_ymd(-10.0)
        assert (y, m, d) == (0, 0, 0)

    def test_zero(self):
        y, m, d = _days_to_ymd(0.0)
        assert (y, m, d) == (0, 0, 0)

    def test_round_not_truncate(self):
        """Verify days are rounded, not truncated."""
        y, m, d = _days_to_ymd(365.25)
        assert y == 1
        assert m == 0
        assert d == 0


# =====================================================================
# Case B: DOB 2004-08-13
# =====================================================================
def test_2004_birth_regression():
    """Case B: 13-08-2004 birth - Saturn/Rahu must be active on 2026-09-14."""
    dob = date(2004, 8, 13)
    tob = time(14, 42)
    res = calculate_chart(dob, tob, "Kolkata")
    _verify_chart_invariants(res, "2004 birth")

    # First Mahadasha is Jupiter
    first_md = res.mahadasha_list[0]
    assert first_md.planet == "Jupiter"
    assert first_md.start_date == date(2004, 8, 13)
    assert first_md.end_date == date(2012, 5, 6)

    # Saturn Mahadasha must remain unchanged
    saturn_md = next(m for m in res.mahadasha_list if m.planet == "Saturn")
    assert saturn_md.start_date == date(2012, 5, 6)
    assert saturn_md.end_date == date(2031, 5, 6)

    # Saturn/Rahu must be active on 2026-09-14
    saturn_rahu = next(ad for ad in saturn_md.antardashas if ad.planet == "Rahu")
    assert saturn_rahu.start_date <= date(2026, 9, 14) < saturn_rahu.end_date
    assert (saturn_rahu.duration_years, saturn_rahu.duration_months, saturn_rahu.duration_days) == (2, 10, 6)


# =====================================================================
# Case A: DOB 2026-08-13
# =====================================================================
def test_2026_birth_regression():
    """Case A: 13-08-2026 birth - First visible AD is Ketu/Mars, NOT Ketu/Ketu."""
    dob = date(2026, 8, 13)
    tob = time(14, 42)
    res = calculate_chart(dob, tob, "Kolkata")
    _verify_chart_invariants(res, "2026 birth")

    # First Mahadasha is Ketu
    ketu_md = res.mahadasha_list[0]
    assert ketu_md.planet == "Ketu"
    assert ketu_md.start_date == date(2026, 8, 13)
    assert ketu_md.end_date == date(2030, 12, 13)

    # First visible AD must be Mars, NOT Ketu
    assert ketu_md.antardashas[0].planet == "Mars"
    assert ketu_md.antardashas[0].start_date == date(2026, 8, 13)
    assert ketu_md.antardashas[0].end_date == date(2026, 11, 12)

    # Expected sequence: Mars -> Rahu -> Jupiter -> Saturn -> Mercury
    expected_sequence = [
        ("Mars",    date(2026, 8, 13),  date(2026, 11, 12)),
        ("Rahu",    date(2026, 11, 12), date(2027, 12, 1)),
        ("Jupiter", date(2027, 12, 1),  date(2028, 11, 6)),
        ("Saturn",  date(2028, 11, 6),  date(2029, 12, 16)),
        ("Mercury", date(2029, 12, 16), date(2030, 12, 13)),
    ]
    assert len(ketu_md.antardashas) == len(expected_sequence)
    for ad, (exp_p, exp_s, exp_e) in zip(ketu_md.antardashas, expected_sequence):
        assert ad.planet == exp_p, f"Expected {exp_p}, got {ad.planet}"
        assert ad.start_date == exp_s, f"{ad.planet} start: expected {exp_s}, got {ad.start_date}"
        assert ad.end_date == exp_e, f"{ad.planet} end: expected {exp_e}, got {ad.end_date}"

    # Top current antardashas starts at Ketu/Mars
    assert res.current_antardashas[0]["mahadasha"] == "Ketu"
    assert res.current_antardashas[0]["antardasha"] == "Mars"


# =====================================================================
# Standard birth years
# =====================================================================
def test_2024_birth():
    """Test 2024 birth date."""
    dob = date(2024, 8, 13)
    tob = time(14, 42)
    res = calculate_chart(dob, tob, "Kolkata")
    _verify_chart_invariants(res, "2024 birth")


def test_2025_birth():
    """Test 2025 birth date."""
    dob = date(2025, 8, 13)
    tob = time(14, 42)
    res = calculate_chart(dob, tob, "Kolkata")
    _verify_chart_invariants(res, "2025 birth")


# =====================================================================
# Edge cases: day 31, leap day
# =====================================================================
def test_birth_on_day_31():
    """Test births on day 31 across different months."""
    for month in [1, 3, 5, 7, 8, 10, 12]:
        dob = date(2024, month, 31)
        res = calculate_chart(dob, time(12, 0), "Kolkata")
        _verify_chart_invariants(res, f"Day 31 (month {month})")


def test_leap_year_feb_29():
    """Test birth on leap day February 29."""
    dob = date(2024, 2, 29)
    res = calculate_chart(dob, time(12, 0), "Kolkata")
    _verify_chart_invariants(res, "Leap day 2024-02-29")


# =====================================================================
# First Mahadasha balance extremes
# =====================================================================
def test_first_mahadasha_high_balance():
    """Test first Mahadasha with high remaining balance (nearly full)."""
    birth = date(2026, 8, 13)
    md_end = add_calendar_ymd(birth, 6, 11, 20)
    ads = _calc_antardasha("Ketu", birth, 0, True, 0, 7, md_end=md_end)
    assert len(ads) == 9
    assert ads[0].planet == "Ketu"
    assert ads[0].start_date == birth
    assert ads[-1].end_date == md_end
    for i in range(len(ads) - 1):
        assert ads[i].end_date == ads[i + 1].start_date


def test_first_mahadasha_low_balance():
    """Test first Mahadasha with low remaining balance (10 days)."""
    birth = date(2026, 8, 13)
    md_end = add_calendar_ymd(birth, 0, 0, 10)
    ads = _calc_antardasha("Ketu", birth, 0, True, 0, 7, md_end=md_end)
    assert len(ads) == 1
    assert ads[0].planet == "Mercury"
    assert ads[0].start_date == birth
    assert ads[0].end_date == md_end


# =====================================================================
# Full later Mahadashas for all planets
# =====================================================================
def test_full_later_mahadashas():
    """Test full later Mahadashas — AD boundary sums match MD end for all 9 planets."""
    start = date(2030, 1, 1)
    for planet, full_years in DASHA_YEARS.items():
        md_end = add_calendar_ymd(start, full_years, 0, 0)
        ads = _calc_antardasha(planet, start, 0, False, 0, full_years, md_end=md_end)
        assert len(ads) == 9
        assert ads[0].start_date == start
        assert ads[-1].end_date == md_end
        for i in range(8):
            assert ads[i].end_date == ads[i + 1].start_date
            assert ads[i].start_date <= ads[i].end_date
