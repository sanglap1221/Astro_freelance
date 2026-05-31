from __future__ import annotations

"""Validate a single Lahiri book epoch against the current calculation engine.

This script does not change the engine. It is a focused comparison harness for
book-vs-software investigation on the 1941 ephemeris page.
"""

from dataclasses import dataclass
from datetime import date, time
from pathlib import Path
import sys
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from app.astrology.calculations import calculate_chart, PlanetResult  # noqa: E402
except RuntimeError as exc:
    calculate_chart = None  # type: ignore[assignment]
    PlanetResult = object  # type: ignore[assignment]
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


@dataclass(frozen=True)
class BookValue:
    planet: str
    longitude: float


def _format_dms(longitude: float) -> str:
    sign_index = int(longitude // 30)
    sign_degree = longitude % 30.0
    degrees = int(sign_degree)
    minutes_float = (sign_degree - degrees) * 60.0
    minutes = int(minutes_float)
    seconds = int(round((minutes_float - minutes) * 60.0))
    return f"{sign_index:02d} | {degrees:02d}° {minutes:02d}' {seconds:02d}\""


def _diff_degrees(left: float, right: float) -> float:
    diff = (left - right + 180.0) % 360.0 - 180.0
    return diff

book_values = {
    "Sun": "08 | 17° 10' 00\"",
    "Moon": "09 | 26° 04' 00\"",
    "Mars": "07 | 04° 24' 00\"",
    "Mercury": "08 | 11° 02' 00\"",
    "Jupiter": "00 | 12° 39' 00\"",
    "Venus": "07 | 20° 53' 00\"",
    "Saturn": "00 | 14° 55' 00\""
} 
def _find_planet(planets: Iterable[PlanetResult], name: str) -> PlanetResult:
    for planet in planets:
        if planet.name == name:
            return planet
    raise KeyError(f"Planet not found: {name}")


def main() -> None:
    if IMPORT_ERROR is not None or calculate_chart is None:
        print(str(IMPORT_ERROR))
        print("Install the backend dependency first, then rerun this script.")
        raise SystemExit(1)

    dob = date(1941, 1, 1)
    birth_time = time(5, 30)
    place = "Kolkata"

    chart = calculate_chart(
        dob=dob,
        birth_time=birth_time,
        place=place,
        ayanamsa_mode="lahiri",
        true_moon=True,
        true_node=True,
        debug_trace=True,
    )

    # Fill these with the book values you are validating against.
    # The script is intentionally written so you can paste the page-74/page-87
    # numbers without touching the engine code again. You may provide either
    # a list of BookValue objects or a simple dict mapping planet->DMS string.
    book_values = {
        "Sun": "08 | 17° 10' 00\"",
        "Moon": "09 | 26° 04' 00\"",
        "Mars": "07 | 04° 24' 00\"",
        "Mercury": "08 | 11° 02' 00\"",
        "Jupiter": "00 | 12° 39' 00\"",
        "Venus": "07 | 20° 53' 00\"",
        "Saturn": "00 | 14° 55' 00\"",
    }

    # Helper to parse book DMS strings like "08 | 17° 10' 00\"" into decimal degrees
    def _parse_book_dms(token: str) -> float:
        import re

        nums = re.findall(r"\d+", token)
        if len(nums) < 3:
            raise ValueError(f"Invalid book DMS token: {token!r}")
        sign = int(nums[0])
        deg = int(nums[1])
        mins = int(nums[2])
        secs = int(nums[3]) if len(nums) >= 4 else 0
        # Book sign is 1-based (1..12). Convert to 0-based internal longitude.
        sign0 = sign
        return sign0 * 30.0 + deg + mins / 60.0 + secs / 3600.0

    print(f"Validation case: {dob.isoformat()} {birth_time.isoformat()} {place}")
    print(f"Ayanamsa: {chart.ayanamsa:.6f}")
    print()
    print(f"{'Planet':<10} {'Software':<23} {'Book':<23} {'Diff'}")
    print("-" * 72)

    planets_in_order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]

    # Build a lookup mapping planet -> book longitude (decimal degrees).
    if isinstance(book_values, dict):
        book_lookup = {k: _parse_book_dms(v) for k, v in book_values.items()}
    else:
        book_lookup = {item.planet: item.longitude for item in book_values}

    for planet_name in planets_in_order:
        software_planet = _find_planet(chart.planets, planet_name)
        book_longitude = book_lookup.get(planet_name)
        if book_longitude is None:
            book_text = "<book value needed>"
            diff_text = ""
        else:
            diff = _diff_degrees(software_planet.longitude, book_longitude)
            # Prefer to display the original book token if provided as a dict
            if isinstance(book_values, dict):
                book_text = book_values.get(planet_name, "<book value needed>")
            else:
                book_text = _format_dms(book_longitude)
            diff_text = f"{diff:+.6f}°"
        print(
            f"{planet_name:<10} "
            f"{_format_dms(software_planet.longitude):<23} "
            f"{book_text:<23} "
            f"{diff_text}"
        )

    print()
    print("Rahu debug:")
    trace = chart.debug_trace or {}
    planet_trace = trace.get("planet_trace", [])
    rahu_trace = next((item for item in planet_trace if item.get("planet") == "Rahu"), None)
    if rahu_trace:
        print(rahu_trace)
    else:
        print("No debug trace available for Rahu")


if __name__ == "__main__":
    main()