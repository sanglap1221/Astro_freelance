from __future__ import annotations

from datetime import date, time
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from app.astrology.calculations import calculate_chart
except RuntimeError as exc:
    print(exc)
    raise SystemExit(1)


def run():
    dob = date(1991, 1, 1)
    birth_time = time(5, 30)
    place = "Kolkata"

    chart = calculate_chart(dob=dob, birth_time=birth_time, place=place, ayanamsa_mode="lahiri", true_moon=True, true_node=True)

    # TODO: fill book values
    book_values = {}

    print(f"Validation case: {dob.isoformat()} {birth_time.isoformat()} {place}")
    print(f"Ayanamsa: {chart.ayanamsa:.6f}")
    for p in chart.planets:
        print(p.name, p.longitude)


if __name__ == '__main__':
    run()
