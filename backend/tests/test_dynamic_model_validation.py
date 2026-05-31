from __future__ import annotations

from datetime import date, time

from app.astrology.calculations import calculate_chart


TUNED_PARAMS = {
    "PM_BAGCHI_BASE_OFFSET_DEGREES": "3.315422",
    "PM_BAGCHI_YEAR_COEFF_DEGREES": "-0.000723",
    "PM_BAGCHI_SEASONAL_AMP_DEGREES": "-0.298975",
    "PM_BAGCHI_LON_TERM_AMP_DEGREES": "-0.224951",
}


CASES = [
    ("Sanglap", date(2004, 8, 13), time(14, 42)),
    ("Arka", date(2023, 10, 29), time(8, 42)),
    ("Sounak", date(2008, 2, 7), time(14, 0)),
    ("BoundaryPre", date(2021, 3, 20), time(5, 29)),
    ("BoundaryPost", date(2021, 3, 20), time(5, 31)),
]


EXPECTED = {
    "Sanglap": (2, 26, 36),
    "Arka": (0, 14, 25),
    "Sounak": (9, 26, 0),
}


def _arcmin_diff(a: float, b: float) -> float:
    d = abs((a - b) % 360.0)
    d = min(d, 360.0 - d)
    return d * 60.0


def test_dynamic_moon_model_stability():
    # This test validates that the dynamic model stays bounded and preserves chart semantics.
    import os

    os.environ.update(TUNED_PARAMS)
    moon_diffs = []
    for label, dob, bt in CASES:
        chart = calculate_chart(dob, bt, "Kolkata")
        moon = next(p for p in chart.planets if p.name == "Moon")
        if label in EXPECTED:
            sign_idx, deg, mins = EXPECTED[label]
            expected_lon = sign_idx * 30.0 + deg + mins / 60.0
            moon_diffs.append(_arcmin_diff(moon.longitude, expected_lon))
            assert chart.nakshatra is not None
            assert chart.current_dasha_balance[0] is not None
    assert moon_diffs, "Expected at least one sacred chart residual"
    assert max(moon_diffs) < 15.0
