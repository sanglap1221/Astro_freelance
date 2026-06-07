from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time
from pathlib import Path
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.astrology.calculations import ZODIAC_SIGNS_BN, calculate_chart
from app.pdf.generate_pdf import build_report_context, generate_pdf_report
from app.schemas import PdfRequest


@dataclass(frozen=True)
class ValidationCase:
    name: str
    dob: date
    tob: time
    place: str
    expected_lagna_idx: int | None = None
    expected_planets: dict[str, int] | None = None


CASES: list[ValidationCase] = [
    ValidationCase(
        name="Agniv Ghosh",
        dob=date(2018, 2, 17),
        tob=time(11, 58),
        place="Kolkata",
        expected_lagna_idx=1,
        expected_planets={
            "Sun": 10,
            "Mercury": 10,
            "Venus": 10,
            "Mars": 7,
            "Jupiter": 6,
            "Saturn": 8,
            "Rahu": 3,
            "Ketu": 9,
        },
    ),
    ValidationCase(
        name="Mitali Biswas",
        dob=date(2006, 7, 18),
        tob=time(8, 0),
        place="Kolkata",
        expected_lagna_idx=4,
        expected_planets={
            "Sun": 12,
            "Mercury": 12,
            "Saturn": 12,
            "Mars": 1,
            "Jupiter": 3,
            "Rahu": 8,
            "Ketu": 2,
        },
    ),
    ValidationCase(
        name="Unspecified Sample A",
        dob=date(1995, 3, 22),
        tob=time(17, 30),
        place="Kolkata",
    ),
    ValidationCase(
        name="Unspecified Sample B",
        dob=date(2024, 11, 15),
        tob=time(9, 53),
        place="Kolkata",
    ),
]


def _format_house_planets(house_chart: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for house in house_chart:
        lines.append(f"  House {house['house']}: {', '.join(house['planets']) or '-'}")
    return "\n".join(lines)


def _house_lookup(chart: Any) -> dict[int, list[str]]:
    houses: dict[int, list[str]] = {index: [] for index in range(1, 13)}
    for planet in chart.planets:
        houses[planet.house].append(planet.name)
    return houses


def _check_planets(actual: dict[int, list[str]], expected: dict[str, int]) -> tuple[bool, list[str]]:
    actual_by_planet: dict[str, int] = {}
    for house_no, planets in actual.items():
        for planet_name in planets:
            actual_by_planet[planet_name] = house_no

    messages: list[str] = []
    ok = True
    for planet_name, expected_house in expected.items():
        actual_house = actual_by_planet.get(planet_name)
        if actual_house == expected_house:
            messages.append(f"    ✅ {planet_name:<8} house {actual_house}")
        else:
            messages.append(f"    ❌ {planet_name:<8} house {actual_house} != {expected_house}")
            ok = False
    return ok, messages


def run_validation() -> int:
    print("=" * 78)
    print(" AUTOMATED CHART RENDERING & SIGN INDEX VALIDATOR")
    print("=" * 78)

    all_passed = True
    generated_paths: list[str] = []

    for case in CASES:
        print(f"\nCase: {case.name} | {case.dob.isoformat()} {case.tob.isoformat()} | {case.place}")
        print("-" * 78)

        chart = calculate_chart(
            dob=case.dob,
            birth_time=case.tob,
            place=case.place,
            ayanamsa_mode="lahiri",
            true_moon=True,
            true_node=True,
        )
        context = build_report_context(
            PdfRequest(
                name=case.name,
                father_name=None,
                dob=case.dob,
                time=case.tob,
                place=case.place,
                mobile=None,
            )
        )

        rendered_house_labels = [entry["house_bn"] for entry in context["house_chart"]]
        rendered_lagna_marker = context["house_chart"][0]["planets"][0] if (context["house_chart"] and context["house_chart"][0]["planets"]) else ""
        house_chart = _house_lookup(chart)

        print(f"Lagna sign index : {chart.lagna_sign_index}")
        print(f"Lagna sign name  : {chart.lagna_sign} ({ZODIAC_SIGNS_BN[chart.lagna_sign_index]})")
        print(f"Lagna time range : {context.get('lagna_time_range')}")
        print(f"Lagna long comp  : {context.get('lagna_compact_indexed')}")
        print(f"Rendered labels  : {', '.join(rendered_house_labels)}")
        print(f"Rendered Lagna   : {rendered_lagna_marker}")
        print("House chart      :")
        print(_format_house_planets(context["house_chart"]))

        if case.expected_lagna_idx is not None:
            if chart.lagna_sign_index == case.expected_lagna_idx:
                print(f"    ✅ Lagna index matches expected {case.expected_lagna_idx}")
            else:
                print(f"    ❌ Lagna index {chart.lagna_sign_index} != expected {case.expected_lagna_idx}")
                all_passed = False

        if case.expected_planets:
            ok, messages = _check_planets(house_chart, case.expected_planets)
            for message in messages:
                print(message)
            all_passed = all_passed and ok

        pdf_result = generate_pdf_report(
            PdfRequest(
                name=case.name,
                father_name=None,
                dob=case.dob,
                time=case.tob,
                place=case.place,
                mobile=None,
            )
        )
        generated_paths.append(pdf_result.pdf_url)
        pdf_path = Path(__file__).resolve().parents[1] / pdf_result.pdf_url.lstrip("/")
        print(f"PDF generated    : {pdf_result.pdf_url}")
        print(f"PDF exists       : {'yes' if pdf_path.exists() else 'no'}")

    print("\n" + "=" * 78)
    print("SUMMARY")
    print("=" * 78)
    for pdf_url in generated_paths:
        print(f"Generated: {pdf_url}")
    print("PASS" if all_passed else "FAIL")
    return 0 if all_passed else 1


if __name__ == "__main__":
    raise SystemExit(run_validation())
