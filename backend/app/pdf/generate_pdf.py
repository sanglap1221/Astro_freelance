from datetime import date, datetime
import os
from pathlib import Path
import random
from typing import Any
import uuid
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright

from app.astrology.calculations import (
    ZODIAC_SIGNS_BN,
    calculate_chart,
    format_sign_compact_bn,
    format_sign_dms_bn,
)
from app.astrology.bengali_date import (
    gregorian_to_bengali,
    format_bengali_date_bn,
)
from app.schemas import PdfRequest

PLANETS_BN = {
    "Sun": "রবি",
    "Moon": "চন্দ্র",
    "Mars": "মঙ্গল",
    "Mercury": "বুধ",
    "Jupiter": "বৃহস্পতি",
    "Venus": "শুক্র",
    "Saturn": "শনি",
    "Rahu": "রাহু",
    "Ketu": "কেতু",
}

PLANET_ABBR_BN = {
    "Sun": "র",
    "Moon": "চ",
    "Mars": "ম",
    "Mercury": "বু",
    "Jupiter": "বৃ",
    "Venus": "শু",
    "Saturn": "শ",
    "Rahu": "রা",
    "Ketu": "কে",
}

PLANET_DISPLAY_ORDER = ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Rahu", "Ketu"]

WEEKDAYS_MAP = {
    "Sun": "রবিবার",
    "Mon": "সোমবার",
    "Tue": "মঙ্গলবার",
    "Wed": "বুধবার",
    "Thu": "বৃহস্পতিবার",
    "Fri": "শুক্রবার",
    "Sat": "শনিবার",
}


def to_bengali_digits(value: Any) -> str:
    """Convert digits in a string or stringifiable object to Bengali digits."""
    val_str = str(value)
    digits = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
    return val_str.translate(digits)


class PdfReportResult:
    def __init__(self, pdf_url: str):
        self.pdf_url = pdf_url


def build_report_context(payload: PdfRequest) -> dict[str, Any]:
    # 1. Run astrological calculations
    chart = calculate_chart(
        dob=payload.dob,
        birth_time=payload.time,
        place=payload.place,
        latitude=getattr(payload, 'latitude', None),
        longitude=getattr(payload, 'longitude', None),
        timezone=getattr(payload, 'timezone', None),
        ayanamsa_mode=payload.ayanamsa_mode,
        custom_ayanamsa_degrees=payload.custom_ayanamsa_degrees,
        true_moon=payload.true_moon,
        true_node=payload.true_node,
        planet_overrides=payload.planet_overrides,
        override_moon_longitude=payload.override_moon_longitude,
    )

    # 2. Generate report_no (Bengali digits)
    report_no = to_bengali_digits(str(random.randint(10000, 99999)))

    # 3. Formulate generated_at
    current_date = date.today()
    generated_at = to_bengali_digits(current_date.strftime("%d-%m-%Y"))

    # 4. Formulate customer
    by, bm, bd = gregorian_to_bengali(payload.dob)
    bengali_dob = format_bengali_date_bn(by, bm, bd)

    weekday_en = payload.dob.strftime("%a")
    weekday_bn = WEEKDAYS_MAP.get(weekday_en, "-")

    customer = {
        "name": to_bengali_digits(payload.name),
        "father_name": to_bengali_digits(payload.father_name) if payload.father_name else "",
        "dob": to_bengali_digits(payload.dob.strftime("%d-%m-%Y")),
        "bengali_dob": bengali_dob,
        "time": to_bengali_digits(payload.time.strftime("%H:%M")),
        "place": to_bengali_digits(payload.place),
        "weekday": weekday_bn,
        "mobile": to_bengali_digits(payload.mobile) if payload.mobile else "",
    }

    # 5. Formulate engine metadata
    engine = {
        "engine": "Swiss Ephemeris",
        "system": "Nirayana (Sidereal)",
        "ayanamsa": "Traditional Bengali N.C. Lahiri Workflow",
        "custom_ayanamsa_degrees": payload.custom_ayanamsa_degrees,
        "moon_mode": "True Moon" if payload.true_moon else "Mean Moon",
        "true_node": payload.true_node,
        "planet_overrides": payload.planet_overrides,
        "override_moon": to_bengali_digits(f"{payload.override_moon_longitude:.4f}°")
        if payload.override_moon_longitude is not None
        else None,
    }

    # 6. Formulate summary
    rashi_bn = ZODIAC_SIGNS_BN[chart.rashi_sign_index]
    lagna_bn = ZODIAC_SIGNS_BN[chart.lagna_sign_index]

    bal = chart.current_dasha_balance
    dasha_balance_str = (
        f"{PLANETS_BN.get(bal[0], bal[0])} — "
        f"{to_bengali_digits(str(bal[1]))} বছর "
        f"{to_bengali_digits(str(bal[2]))} মাস "
        f"{to_bengali_digits(str(bal[3]))} দিন"
    )

    summary = {
        "rashi": rashi_bn,
        "lagna": lagna_bn,
        "lagna_sign_index": chart.lagna_sign_index,
        "nakshatra": chart.nakshatra.name_bn,
        "nakshatra_pada": to_bengali_digits(str(chart.nakshatra.pada)),
        "nakshatra_lord": PLANETS_BN.get(chart.nakshatra.lord, chart.nakshatra.lord),
        "pada": to_bengali_digits(str(chart.nakshatra.pada)),
        "ayanamsa": to_bengali_digits(f"{chart.ayanamsa:.4f}"),
        "gan": chart.gana,
        "varna": chart.varna_bn,
        "shubh_bar": ", ".join(chart.lucky_days_bn),
        "shubh_rong": ", ".join(chart.lucky_colors_bn),
        "shubh_sonkha": ", ".join(to_bengali_digits(str(num)) for num in chart.lucky_numbers),
        "namer_adokkhyor": chart.nakshatra.current_pada_syllable,
        "current_pada_syllable": chart.nakshatra.current_pada_syllable,
        "all_nakshatra_syllables": list(chart.nakshatra.all_nakshatra_syllables),
        "dasha_balance": dasha_balance_str,
    }

    # 7. Formulate shorthand_planets
    sorted_planets = sorted(
        chart.planets,
        key=lambda p: PLANET_DISPLAY_ORDER.index(p.name) if p.name in PLANET_DISPLAY_ORDER else 99,
    )

    shorthand_planets = []
    for p in sorted_planets:
        display_str = format_sign_dms_bn(p.longitude)
        compact_str = format_sign_compact_bn(p.longitude)
        # Build a 1-based sign index + DMS string for PDF display (e.g. "2 | ২৬° ৩৫′ ৫৯″")
        lon_norm = p.longitude % 360.0
        sign_index_0b = int(lon_norm // 30)
        pos_in_sign = lon_norm % 30.0
        deg = int(pos_in_sign)
        rem = (pos_in_sign - deg) * 60.0
        mins = int(rem)
        secs = int((rem - mins) * 60.0)
        deg_bn = to_bengali_digits(f"{deg:02d}")
        min_bn = to_bengali_digits(f"{mins:02d}")
        sec_bn = to_bengali_digits(f"{secs:02d}")
        sign_index_bn = to_bengali_digits(str(sign_index_0b))
        
        # Base coordinate text mapping
        compact_indexed = f"{sign_index_bn} | {deg_bn}° {min_bn}′ {sec_bn}″"

        shorthand_planets.append({
            "short": PLANETS_BN.get(p.name, p.name),
            "full": p.name,
            "display": display_str,
            "compact": compact_str,
            "compact_indexed": compact_indexed,
            "is_retrograde": p.is_retrograde,
            "is_combust": p.is_combust,
        })

    # 8. Formulate house_chart
    house_chart = []
    for sign_idx in range(12):
        house_planets = []
        is_lagna_house = (sign_idx == chart.lagna_sign_index)
        house_number = ((sign_idx - chart.lagna_sign_index) % 12) + 1

        for p in chart.planets:
            if p.sign_index == sign_idx:
                house_planets.append(PLANET_ABBR_BN.get(p.name, p.name))

        house_bn = to_bengali_digits(str(house_number))
        house_chart.append({
            "sign_index": sign_idx,
            "house": house_number,
            "house_bn": house_bn,
            "is_lagna_house": is_lagna_house,
            "planets": house_planets,
            "planets_text": ", ".join(house_planets),
        })

    # 9. Formulate dasha_list
    dasha_list = []
    for d in chart.mahadasha_list:
        is_active = d.start_date <= current_date < d.end_date
        dasha_list.append({
            "planet": d.planet,
            "planet_bn": PLANETS_BN.get(d.planet, d.planet),
            "years": to_bengali_digits(str(d.years)),
            "start": to_bengali_digits(d.start_date.strftime("%d-%m-%Y")),
            "end": to_bengali_digits(d.end_date.strftime("%d-%m-%Y")),
            "is_active": is_active,
        })

    # 10. Formulate antardasha_list
    antardasha_list = []
    for d in chart.mahadasha_list:
        subperiods = []
        for ad in d.antardashas:
            subperiods.append({
                "lord": ad.planet,
                "lord_bn": PLANETS_BN.get(ad.planet, ad.planet),
                "start": to_bengali_digits(ad.start_date.strftime("%d-%m-%Y")),
                "end": to_bengali_digits(ad.end_date.strftime("%d-%m-%Y")),
            })
        antardasha_list.append({
            "major_lord": d.planet,
            "major_bn": PLANETS_BN.get(d.planet, d.planet),
            "subperiods": subperiods,
        })

    # 10b. Flatten antardashas into a chronological display window starting at the active row
    flattened_antardashas: list[dict[str, Any]] = []
    for d in chart.mahadasha_list:
        for ad in d.antardashas:
            flattened_antardashas.append({
                "major_lord": d.planet,
                "major_bn": PLANETS_BN.get(d.planet, d.planet),
                "lord": ad.planet,
                "lord_bn": PLANETS_BN.get(ad.planet, ad.planet),
                "start": to_bengali_digits(ad.start_date.strftime("%d-%m-%Y")),
                "end": to_bengali_digits(ad.end_date.strftime("%d-%m-%Y")),
                "start_date": ad.start_date,
                "end_date": ad.end_date,
                "mahadasha_bn": PLANETS_BN.get(d.planet, d.planet),
                "antardasha_bn": PLANETS_BN.get(ad.planet, ad.planet),
                "start_date_bn": to_bengali_digits(ad.start_date.strftime("%Y - %m - %d")),
                "end_date_bn": to_bengali_digits(ad.end_date.strftime("%Y - %m - %d")),
                "duration_bn": f"{to_bengali_digits(str(ad.duration_years))} - {to_bengali_digits(str(ad.duration_months))} - {to_bengali_digits(str(ad.duration_days))}",
            })

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    active_antardasha_index = 0
    for index, row in enumerate(flattened_antardashas):
        if row["start_date"] <= today < row["end_date"]:
            active_antardasha_index = index
            break
        if today < row["start_date"]:
            active_antardasha_index = index
            break

    current_antardashas = flattened_antardashas[active_antardasha_index:active_antardasha_index + 9]
    if not current_antardashas:
        current_antardashas = flattened_antardashas[:9]

    # 11. Formulate empty/dummy kundli_grid matching types
    kundli_grid = [[{"empty": True} for _ in range(4)] for _ in range(4)]

    return {
        "report_no": report_no,
        "generated_at": generated_at,
        "customer": customer,
        "engine": engine,
        "summary": summary,
        "shorthand_planets": shorthand_planets,
        "kundli_grid": kundli_grid,
        "house_chart": house_chart,
        "dasha_list": dasha_list,
        "antardasha_list": antardasha_list,
        "antardasha_display_rows": current_antardashas,
        "current_antardashas": current_antardashas,
    }


def render_pdf_from_context(context: dict[str, Any], filename: str = None) -> str:
    # Set up Jinja2 environment and load template
    templates_dir = Path(__file__).parent / "templates"
    env = Environment(loader=FileSystemLoader(str(templates_dir)))
    template = env.get_template("bengali_report.html")
    html_content = template.render(**context)

    # Output file setup in the backend's generated directory
    backend_root = Path(__file__).resolve().parents[2]
    generated_dir = backend_root / "generated"
    generated_dir.mkdir(exist_ok=True)

    if not filename:
        filename = f"report_{uuid.uuid4().hex}.pdf"
    output_path = generated_dir / filename

    # Compile HTML to PDF using Playwright sync API
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            # Set HTML content and wait until network is idle (to download fonts)
            page.set_content(html_content, wait_until="networkidle")
            
            # Print PDF
            page.pdf(
                path=str(output_path),
                format="A4",
                print_background=True,
                margin={
                    "top": "0mm",
                    "bottom": "0mm",
                    "left": "0mm",
                    "right": "0mm",
                },
            )
        finally:
            browser.close()

    return f"/generated/{filename}"


def generate_pdf_report(payload: PdfRequest) -> PdfReportResult:
    context = build_report_context(payload)
    # Default layout options
    context["show_kundli"] = True
    context["show_mahadasha"] = True
    context["show_antardasha"] = True
    context["show_lucky_info"] = True
    
    pdf_url = render_pdf_from_context(context)
    return PdfReportResult(pdf_url=pdf_url)
