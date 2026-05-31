from datetime import date, time

from app.astrology.calculations import calculate_chart


def _moon_longitude_deg(chart):
    moon = next(p for p in chart.planets if p.name == "Moon")
    return moon.longitude


def _angular_diff_deg(a: float, b: float) -> float:
    diff = abs((a - b) % 360.0)
    return min(diff, 360.0 - diff)


def _expected_abs_longitude(sign_index: int, deg: int, mins: int) -> float:
    return sign_index * 30.0 + deg + (mins / 60.0)


def test_moon_acceptance_sanglap_2004_08_13_1442():
    chart = calculate_chart(date(2004, 8, 13), time(14, 42), "Kolkata")
    expected = _expected_abs_longitude(2, 26, 36)  # Gemini 26°36'
    actual = _moon_longitude_deg(chart)
    assert _angular_diff_deg(actual, expected) <= (10.0 / 60.0)


def test_moon_acceptance_arka_2023_10_29_0842():
    chart = calculate_chart(date(2023, 10, 29), time(8, 42), "Kolkata")
    expected = _expected_abs_longitude(0, 14, 25)  # Aries 14°25'
    actual = _moon_longitude_deg(chart)
    assert _angular_diff_deg(actual, expected) <= (15.0 / 60.0)


def test_moon_acceptance_sounak_2008_02_07_1400():
    chart = calculate_chart(date(2008, 2, 7), time(14, 0), "Kolkata")
    expected = _expected_abs_longitude(9, 26, 0)  # Capricorn 26°00'
    actual = _moon_longitude_deg(chart)
    assert _angular_diff_deg(actual, expected) <= (10.0 / 60.0)
