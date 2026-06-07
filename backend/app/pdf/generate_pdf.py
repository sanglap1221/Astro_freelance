from datetime import date, datetime
import os
from pathlib import Path
import random
from typing import Any
import uuid
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader

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
    from app.astrology.calculations import KAKA_RASHI_ALPHABET

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
        
        # Pull pre-joined string lists directly from the chart object structures
        "shubh_bar": chart.lucky_days_bn[0],
        "ashubh_bar": chart.ashubh_bar_bn[0],
        "shubh_rong": chart.lucky_colors_bn[0],
        "shubh_sonkha": to_bengali_digits(chart.lucky_numbers_bn[0] if hasattr(chart, 'lucky_numbers_bn') else ", ".join(str(n) for n in chart.lucky_numbers)),
        
        # FIXED: Rashi-based first alphabet assignment matching the last row
        "namer_adokkhyor": KAKA_RASHI_ALPHABET.get(chart.rashi_sign_index, "-"),
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

    # 8. Formulate house_chart (Enriched with Nakshatra Numbers)
    house_chart = []
    for sign_idx in range(12):
        house_planets = []
        is_lagna_house = (sign_idx == chart.lagna_sign_index)
        house_number = ((sign_idx - chart.lagna_sign_index) % 12) + 1

        for p in chart.planets:
            if p.sign_index == sign_idx:
                # Get the planet abbreviation (e.g., "কে")
                abbr = PLANET_ABBR_BN.get(p.name, p.name)
                
                # Calculate the 1-based Nakshatra number from absolute longitude
                # Each Nakshatra spans exactly 13.3333° (360 / 27)
                NAK_SPAN = 360.0 / 27.0
                nak_1_based = (int(p.longitude / NAK_SPAN) % 27) + 1
                nak_bn = to_bengali_digits(str(nak_1_based))
                
                # Combine them matching your layout specification (e.g., "কে ২৫")
                house_planets.append(f"{abbr} {nak_bn}")

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

    def calculate_planet_coords(lagna_sign_index: int, house_chart_list: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
        house_layout = [
            {"numX": 150, "numY": -8, "planetsX": 150, "planetsY": 42, "signIdx": 0},
            {"numX": 72,  "numY": -8, "planetsX": 75,  "planetsY": 25, "signIdx": 1},
            {"numX": -10, "numY": 70, "planetsX": 30,  "planetsY": 52, "signIdx": 2},
            {"numX": -10, "numY": 140, "planetsX": 38,  "planetsY": 135, "signIdx": 3},
            {"numX": -10, "numY": 220, "planetsX": 30,  "planetsY": 222, "signIdx": 4},
            {"numX": 72,  "numY": 318, "planetsX": 75,  "planetsY": 252, "signIdx": 5},
            {"numX": 150, "numY": 318, "planetsX": 150, "planetsY": 205, "signIdx": 6},
            {"numX": 228, "numY": 318, "planetsX": 225, "planetsY": 252, "signIdx": 7},
            {"numX": 310, "numY": 220, "planetsX": 275, "planetsY": 222, "signIdx": 8},
            {"numX": 310, "numY": 140, "planetsX": 262, "planetsY": 135, "signIdx": 9},
            {"numX": 228, "numY": -8,  "planetsX": 225, "planetsY": 25,  "signIdx": 11},
            {"numX": 310, "numY": 70,  "planetsX": 270, "planetsY": 52,  "signIdx": 10}
        ]

        def get_lagna_coords(sign_idx: int) -> dict[str, float]:
            coords_map = {
                0: {"x": 150, "y": 34},
                1: {"x": 75, "y": 17},
                2: {"x": 30, "y": 44},
                3: {"x": 38, "y": 127},
                4: {"x": 30, "y": 214},
                5: {"x": 75, "y": 244},
                6: {"x": 150, "y": 197},
                7: {"x": 225, "y": 244},
                8: {"x": 275, "y": 214},
                9: {"x": 262, "y": 127},
                10: {"x": 270, "y": 44},
                11: {"x": 225, "y": 17}
            }
            return coords_map.get(sign_idx, {"x": 150, "y": 150})

        coords_dict = {}
        for layout in house_layout:
            sign_idx = layout["signIdx"]
            # 1. Separate lagna
            if sign_idx == lagna_sign_index:
                base = get_lagna_coords(sign_idx)
                coords_dict["ল"] = {
                    "x": base["x"],
                    "y": base["y"]
                }

            # 2. Planets
            items = []
            house = house_chart_list[sign_idx]
            if house and house.get("planets"):
                items.extend(house["planets"])

            if not items:
                continue

            count = len(items)
            is_corner_house = sign_idx in [1, 2, 4, 5, 7, 8, 10, 11]
            house_coords = []

            for idx, item_name in enumerate(items):
                base_x = layout["planetsX"]
                base_y = layout["planetsY"]

                if is_corner_house:
                    max_shift = 24
                    max_index_offset = (count - 1) * 0.5
                    ideal_step = 16
                    step = ideal_step
                    if max_index_offset > 0:
                        step = min(ideal_step, max_shift / max_index_offset)

                    index_offset = idx - max_index_offset
                    is_positive_slope = sign_idx in [1, 2, 7, 8]

                    if is_positive_slope:
                        base_x = layout["planetsX"] + index_offset * step
                        base_y = layout["planetsY"] + index_offset * step
                    else:
                        base_x = layout["planetsX"] + index_offset * step
                        base_y = layout["planetsY"] - index_offset * step
                else:
                    is_dense = count >= 4
                    if is_dense:
                        col_spacing = 16
                        row_spacing = 16
                        cols = 3 if count >= 5 else 2
                        row = idx // cols
                        col = idx % cols
                        total_rows = (count + cols - 1) // cols
                        start_x = layout["planetsX"] - ((cols - 1) * col_spacing) / 2
                        start_y = layout["planetsY"] - ((total_rows - 1) * row_spacing) / 2
                        base_x = start_x + col * col_spacing
                        base_y = start_y + row * row_spacing
                    else:
                        # Top (0) & Bottom (6) use Vertical; Left (3) & Right (9) use Horizontal
                        is_horizontal = sign_idx in [3, 9]
                        spacing = 16
                        offset = idx * spacing - (count - 1) * spacing / 2
                        if is_horizontal:
                            base_x = layout["planetsX"] + offset
                            base_y = layout["planetsY"]
                        else:
                            base_x = layout["planetsX"]
                            base_y = layout["planetsY"] + offset

                house_coords.append({"name": item_name, "x": base_x, "y": base_y})

            for coord in house_coords:
                coords_dict[coord["name"]] = {
                    "x": coord["x"],
                    "y": coord["y"]
                }
        return coords_dict

    planet_coords = calculate_planet_coords(chart.lagna_sign_index, house_chart)

    # 12. Formulate Remedial Measures (প্রতিকার : গ্রহরত্ন, শিকড় ও ধাতু)
    # Extracted directly from the traditional hand-written reference sheet
    remedies = [
        {"id": "১", "gemstone": "সহহলে নীলা - ৫/৬ রতি / নাহলে এমিথিস্ট - ২৪/২৫ রতি", "remedy_root": "শ্বেতবেড়ালা + সীসা"},
        {"id": "২", "gemstone": "হীরে - ৪০/৪৫ সেন্ট * অথবা সাদাপলা - ১৮/২০ রতি", "remedy_root": "রামবাসক + প্ল্যাটিনাম"},
        {"id": "৩", "gemstone": "পান্না - ৫/৬ রতি", "remedy_root": "বৃদ্ধদারক + সোনা"},
        {"id": "৪", "gemstone": "পোখরাজ - ৫/৬ রতি", "remedy_root": "বামনহাটি + সোনা"},
        {"id": "৫", "gemstone": "লালপলা - ১০/১১ রতি", "remedy_root": "অনন্তমূল + তামা"},
        {"id": "৬", "gemstone": "মুক্ত - ৭/৮ রতি", "remedy_root": "ক্ষীরিকা + রূপো"},
        {"id": "৭", "gemstone": "চুনী - ৫/৬ রতি", "remedy_root": "বিল্বমূল + তামা"},
        {"id": "৮", "gemstone": "ক্যাটসআই - ৩/৪ রতি", "remedy_root": "অশ্বগন্ধা + রাং"},
        {"id": "৯", "gemstone": "গোমেদ - ৭/৮ রতি", "remedy_root": "শ্বেতচন্দন + লোহা"}
    ]

    # --- 11b. Dynamic Lagna Timings Schedule Array (Safe Add) ---
    from app.astrology.bengali_date import BENGALI_MONTHS_EN
    from app.astrology.lagna_table import get_daily_lagna_timeline, SIGN_TO_INDEX
    from app.astrology.calculations import resolve_location
    
    loc = resolve_location(
        payload.place,
        getattr(payload, 'latitude', None),
        getattr(payload, 'longitude', None),
        getattr(payload, 'timezone', None)
    )
    
    month_name_en = BENGALI_MONTHS_EN[bm]
    raw_timeline = get_daily_lagna_timeline(
        month_name_en, 
        bd, 
        use_sidereal=True,
        dob=payload.dob,
        lat=loc.latitude,
        lon=loc.longitude
    )
    
    # Extract the timing of the active birth Lagna
    lagna_time_range = ""
    for item in raw_timeline:
        sign_idx = SIGN_TO_INDEX.get(item["name_en"], 0)
        if sign_idx == chart.lagna_sign_index:
            def format_time_dot(t_str: str) -> str:
                h, m = t_str.split(":")
                return f"{int(h)}.{m}"
            start_bn = to_bengali_digits(format_time_dot(item["start"]))
            end_bn = to_bengali_digits(format_time_dot(item["end"]))
            lagna_time_range = f"{start_bn}-{end_bn}"
            break

    # Format absolute Lagna (Ascendant) longitude
    lagna_lon = chart.ascendant_longitude % 360.0
    lagna_sign_idx_0b = int(lagna_lon // 30)
    lagna_pos_in_sign = lagna_lon % 30.0
    l_deg = int(lagna_pos_in_sign)
    l_rem = (lagna_pos_in_sign - l_deg) * 60.0
    l_mins = int(l_rem)
    l_secs = int((l_rem - l_mins) * 60.0)
    
    l_deg_bn = to_bengali_digits(f"{l_deg:02d}")
    l_min_bn = to_bengali_digits(f"{l_mins:02d}")
    l_sec_bn = to_bengali_digits(f"{l_secs:02d}")
    l_sign_index_bn = to_bengali_digits(str(lagna_sign_idx_0b))
    
    lagna_compact_indexed = f"{l_sign_index_bn} | {l_deg_bn}° {l_min_bn}′ {l_sec_bn}″"

    # Append these new arrays directly to the context dictionary object
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
        "planet_coords": planet_coords,
        "remedies_list": remedies,  # Added fields
        "lagna_time_range": lagna_time_range,
        "lagna_compact_indexed": lagna_compact_indexed,
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

    # Compile HTML to PDF using Playwright
    # pyrefly: ignore [missing-import]
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html_content)
        page.wait_for_load_state("networkidle")
        page.pdf(
            path=str(output_path),
            format="A4",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
        )
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
