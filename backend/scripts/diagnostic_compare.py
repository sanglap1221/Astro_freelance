from __future__ import annotations

from datetime import date, time
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.astrology.calculations import ZODIAC_SIGNS_BN, calculate_chart

CASES = [
    ("2018-02-17", "11:58", "Agniv Ghosh"),
    ("2006-07-18", "08:00", "Mitali Biswas"),
    ("2024-11-15", "09:53", "Sample C"),
]


def print_case(dob_s: str, tm_s: str, name: str) -> None:
    year, month, day = map(int, dob_s.split("-"))
    hour, minute = map(int, tm_s.split(":"))
    chart = calculate_chart(
        date(year, month, day),
        time(hour, minute),
        "Kolkata",
        ayanamsa_mode="lahiri",
        true_moon=True,
        true_node=True,
    )

    print("\n" + "=" * 92)
    print(f"Case: {name} | {dob_s} {tm_s}")
    print(f"Lagna sign index: {chart.lagna_sign_index} ({chart.lagna_sign} / {ZODIAC_SIGNS_BN[chart.lagna_sign_index]})")
    print(f"{'Planet':<10} {'sign_idx':>8} {'sign_bn':>8} {'house':>6} {'cell_if_sign':>12} {'cell_if_house':>13}")

    for planet in chart.planets:
        sign_cell = planet.sign_index + 1
        house_cell = planet.house
        print(
            f"{planet.name:<10} {planet.sign_index:>8} {ZODIAC_SIGNS_BN[planet.sign_index]:>8} "
            f"{house_cell:>6} {sign_cell:>12} {house_cell:>13}"
        )


if __name__ == "__main__":
    for case in CASES:
        print_case(*case)
