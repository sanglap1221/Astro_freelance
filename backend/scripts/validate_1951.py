from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time
from pathlib import Path
import sys

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


def run():
    if IMPORT_ERROR is not None or calculate_chart is None:
        print(str(IMPORT_ERROR))
        print("Install the backend dependency first, then rerun this script.")
        raise SystemExit(1)

    dob = date(1951, 1, 1)
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

    # TODO: paste N.C. Lahiri book values for 1951 here as planet -> DMS token
    book_values = {}

    print(f"Validation case: {dob.isoformat()} {birth_time.isoformat()} {place}")
    print(f"Ayanamsa: {chart.ayanamsa:.6f}")
    print()
    print(f"{'Planet':<10} {'Software':<23} {'Book':<23} {'Diff'}")
    print("-" * 72)

    planets_in_order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
    book_lookup = {item.planet: item.longitude for item in []} if isinstance(book_values, list) else {}

    for planet_name in planets_in_order:
        software_planet = next((p for p in chart.planets if p.name == planet_name), None)
        if software_planet is None:
            continue
        book_longitude = book_lookup.get(planet_name) or book_values.get(planet_name) if isinstance(book_values, dict) else None
        book_text = book_longitude if book_longitude is not None else "<book value needed>"
        diff_text = ""
        print(
            f"{planet_name:<10} "
            f"{software_planet.longitude:07.4f} "
            f"{book_text:<23} "
            f"{diff_text}"
        )


if __name__ == "__main__":
    run()
