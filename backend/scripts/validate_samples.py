from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time
from typing import Dict, List, Optional
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from app.astrology.calculations import calculate_chart
except Exception as exc:
    print("Failed to import calculate_chart:", exc)
    raise


@dataclass
class Case:
    dob: date
    birth_time: time
    place: str
    book: Optional[Dict[str, str]] = None  # planet -> "sign|deg|min" (book sign assumed 1-based)


CASES: List[Case] = [
    # Example: 2008-02-07 14:00 with example book values provided by user
    Case(dob=date(2008, 2, 7), birth_time=time(14, 0), place="Kolkata", book={
        "Moon": "9|26|0",
        "Saturn": "4|12|33",
        "Jupiter": "8|17|33",
    }),

    # Additional sample dates (book values not filled; paste book values as needed)
    Case(dob=date(1994, 10, 9), birth_time=time(14, 0), place="Kolkata", book=None),
    Case(dob=date(1992, 7, 25), birth_time=time(14, 0), place="Kolkata", book=None),
    Case(dob=date(1984, 5, 28), birth_time=time(14, 0), place="Kolkata", book=None),
    Case(dob=date(1991, 4, 12), birth_time=time(14, 0), place="Kolkata", book=None),
    Case(dob=date(2024, 11, 15), birth_time=time(14, 0), place="Kolkata", book=None),
    Case(dob=date(1995, 3, 22), birth_time=time(14, 0), place="Kolkata", book=None),
]

PLANETS_ORDER = [
    "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"
]


def parse_book_lon(tok: str) -> float:
    """Parse book token like '9|26|0' (sign|deg|min) with book sign 1-based → absolute longitude degrees."""
    parts = [p.strip() for p in tok.split("|")]
    if len(parts) < 3:
        raise ValueError("book token must be sign|deg|min (seconds optional)")
    sign = int(parts[0])
    deg = int(parts[1])
    mins = int(parts[2])
    secs = int(parts[3]) if len(parts) >= 4 else 0
    # Book sign is 1-based (1..12). Convert to 0-based for calculation.
    sign0 = sign - 1
    return sign0 * 30.0 + deg + mins / 60.0 + secs / 3600.0


def dms_from_lon(lon: float):
    lon = lon % 360.0
    sign_index0 = int(lon // 30)
    pos = lon % 30.0
    deg = int(pos)
    rem = (pos - deg) * 60.0
    mins = int(rem)
    secs = int(round((rem - mins) * 60.0))
    # normalize seconds -> may carry to minutes
    if secs >= 60:
        secs -= 60
        mins += 1
    if mins >= 60:
        mins -= 60
        deg += 1
    return sign_index0, deg, mins, secs


def angle_diff(a: float, b: float) -> float:
    diff = (a - b + 180.0) % 360.0 - 180.0
    return diff


def run_case(case: Case):
    chart = calculate_chart(dob=case.dob, birth_time=case.birth_time, place=case.place, ayanamsa_mode="lahiri", true_moon=True, true_node=True)
    planet_map = {p.name: p for p in chart.planets}

    print(f"\nCase: {case.dob.isoformat()} {case.birth_time.isoformat()} {case.place}")
    print(f"Ayanamsa: {chart.ayanamsa:.6f}")
    print()
    print(f"{'Planet':<10} {'Book':<15} {'Software (sign|deg|min|sec)':<28} {'Diff (deg)':>12} {'Sign Δ':>8}")
    print("-" * 78)

    for pname in PLANETS_ORDER:
        software = planet_map.get(pname)
        if software is None:
            # Ketu might be derived; try to compute if absent
            continue
        s_lon = software.longitude
        si0, deg, mins, secs = dms_from_lon(s_lon)
        book_tok = None
        diff_text = ""
        sign_delta = ""
        if case.book and pname in case.book:
            book_tok = case.book[pname]
            b_lon = parse_book_lon(book_tok)
            diff = angle_diff(s_lon, b_lon)
            diff_text = f"{diff:+.6f}"
            # sign delta (1-based)
            s_sign1 = si0 + 1
            b_si0 = int((b_lon // 30))
            b_sign1 = b_si0 + 1
            sign_delta = f"{s_sign1 - b_sign1:+d}"
        book_display = book_tok or "<none>"
        software_display = f"{si0:02d}|{deg:02d}|{mins:02d}|{secs:02d}"
        print(f"{pname:<10} {book_display:<15} {software_display:<28} {diff_text:>12} {sign_delta:>8}")


if __name__ == '__main__':
    for c in CASES:
        run_case(c)
    print("\nDone.")
