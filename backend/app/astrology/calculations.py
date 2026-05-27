from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
import os
from zoneinfo import ZoneInfo
from typing import Any, Optional

try:
    # pyrefly: ignore [missing-import]
    import swisseph as swe
except ImportError as exc:
    raise RuntimeError(
        "Swiss Ephemeris is required. Install with: pip install pyswisseph"
    ) from exc


# ---------------------------------------------------------------------------
# ZODIAC SIGNS (0-based: 0=Mesha/Aries ... 11=Meena/Pisces)
# ---------------------------------------------------------------------------
ZODIAC_SIGNS = [
    "Mesha",       # 0  Aries
    "Vrishabha",   # 1  Taurus
    "Mithuna",     # 2  Gemini
    "Karka",       # 3  Cancer
    "Simha",       # 4  Leo
    "Kanya",       # 5  Virgo
    "Tula",        # 6  Libra
    "Vrischika",   # 7  Scorpio
    "Dhanu",       # 8  Sagittarius
    "Makara",      # 9  Capricorn
    "Kumbha",      # 10 Aquarius
    "Meena",       # 11 Pisces
]

ZODIAC_SIGNS_BN = [
    "মেষ", "বৃষ", "মিথুন", "কর্কট", "সিংহ", "কন্যা",
    "তুলা", "বৃশ্চিক", "ধনু", "মকর", "কুম্ভ", "মীন",
]

# ---------------------------------------------------------------------------
# PLANETS
# ---------------------------------------------------------------------------
PLANETS = [
    ("Sun",     swe.SUN),
    ("Moon",    swe.MOON),
    ("Mars",    swe.MARS),
    ("Mercury", swe.MERCURY),
    ("Jupiter", swe.JUPITER),
    ("Venus",   swe.VENUS),
    ("Saturn",  swe.SATURN),
    ("Rahu",    swe.MEAN_NODE),   # Mean node — standard for Bengali/Vedic
]

# ---------------------------------------------------------------------------
# AYANAMSA MODES (switchable)
# ---------------------------------------------------------------------------
AYANAMSA_MODES = {
    "lahiri": swe.SIDM_LAHIRI,
    "raman": swe.SIDM_RAMAN,
    "krishnamurti": swe.SIDM_KRISHNAMURTI,
    "fagan_bradley": swe.SIDM_FAGAN_BRADLEY,
    "surya_siddhanta": swe.SIDM_SURYASIDDHANTA,
}

TRADITIONAL_PANJIKA_AYANAMSA = 18.7875

_ASCENDANT_TABLE_CACHE: dict[int, dict[str, float]] = {}

def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw.strip())
    except ValueError:
        return default


def _compute_pm_bagchi_dynamic_offset(birth_dt: datetime, swe_moon_longitude: float) -> tuple[float, dict[str, Any]]:
    """Compute a small, slowly-varying PM Bagchi-style offset using a compact formula.

    The formula is purposely simple and tunable:
      offset = base + year_coeff*(year-2000) + seasonal_amp*sin(2pi*month/12) + lon_term

    This produces a date-dependent, wrap-safe offset in degrees. The returned trace
    explains component values for debugging and regression tuning.
    """
    import math

    year = int(birth_dt.year)
    month = int(birth_dt.month)

    # Tunable parameters for the production dynamic model.
    base = _env_float("PM_BAGCHI_BASE_OFFSET_DEGREES", 3.315422)
    year_coeff = _env_float("PM_BAGCHI_YEAR_COEFF_DEGREES", -0.000723)  # deg per year
    seasonal_amp = _env_float("PM_BAGCHI_SEASONAL_AMP_DEGREES", -0.298975)
    lon_amp = _env_float("PM_BAGCHI_LON_TERM_AMP_DEGREES", -0.224951)

    year_term = year_coeff * (year - 2000)
    seasonal_term = seasonal_amp * math.sin(2.0 * math.pi * (month - 1) / 12.0)
    lon_term = lon_amp * math.sin(math.radians(swe_moon_longitude))

    offset = base + year_term + seasonal_term + lon_term

    trace = {
        "dynamic": True,
        "base": round(base, 6),
        "year": year,
        "year_term": round(year_term, 6),
        "seasonal_term": round(seasonal_term, 6),
        "lon_term": round(lon_term, 6),
        "offset_degrees": round(offset, 6),
    }

    return float(offset), trace


# ---------------------------------------------------------------------------
# NAKSHATRAS (27)
# Each nakshatra = 360/27 = 13°20' = 13.3333...°
# ---------------------------------------------------------------------------
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
    "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati",
]

NAKSHATRAS_BN = [
    "অশ্বিনী", "ভরণী", "কৃত্তিকা", "রোহিণী", "মৃগশিরা", "আর্দ্রা",
    "পুনর্বসু", "পুষ্যা", "আশ্লেষা", "মঘা", "পূর্বফাল্গুনী",
    "উত্তরফাল্গুনী", "হস্তা", "চিত্রা", "স্বাতী", "বিশাখা",
    "অনুরাধা", "জ্যেষ্ঠা", "মূলা", "পূর্বাষাঢ়া", "উত্তরাষাঢ়া",
    "শ্রবণা", "ধনিষ্ঠা", "শতভিষা", "পূর্বভাদ্রপদ",
    "উত্তরভাদ্রপদ", "রেবতী",
]

# Nakshatra lord order for Vimshottari Dasha
# Ashwini=Ketu, Bharani=Venus, Krittika=Sun, Rohini=Moon, Mrigashira=Mars,
# Ardra=Rahu, Punarvasu=Jupiter, Pushya=Saturn, Ashlesha=Mercury ... repeats
NAKSHATRA_LORD_ORDER = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
    "Jupiter", "Saturn", "Mercury",
]
# Lord of nakshatra index i = NAKSHATRA_LORD_ORDER[i % 9]

# Vimshottari Dasha years (total = 120)
DASHA_YEARS = {
    "Ketu":    7,
    "Venus":   20,
    "Sun":     6,
    "Moon":    10,
    "Mars":    7,
    "Rahu":    18,
    "Jupiter": 16,
    "Saturn":  19,
    "Mercury": 17,
}

# Dasha sequence (fixed order)
DASHA_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury",
]

# ---------------------------------------------------------------------------
# GANA — from Nakshatra (0-based index)
# ---------------------------------------------------------------------------
GAN_MAP_BN = {
    0: "দেব",    # Ashvini
    1: "নর",     # Bharani
    2: "রাক্ষস", # Krittika
    3: "নর",     # Rohini
    4: "দেব",    # Mrigashira
    5: "নর",     # Ardra
    6: "দেব",    # Punarvasu
    7: "দেব",    # Pushya
    8: "রাক্ষস",  # Ashlesha
    9: "রাক্ষস",  # Magha
    10: "নর",    # Purva Phalguni
    11: "নর",    # Uttara Phalguni
    12: "দেব",   # Hasta
    13: "রাক্ষস", # Chitra
    14: "দেব",   # Swati
    15: "রাক্ষস", # Vishakha
    16: "দেব",   # Anuradha
    17: "রাক্ষস", # Jyeshtha
    18: "রাক্ষস", # Mula
    19: "নর",    # Purva Ashadha
    20: "নর",    # Uttara Ashadha
    21: "দেব",   # Shravana
    22: "রাক্ষস", # Dhanishtha
    23: "রাক্ষস", # Shatabhisha
    24: "নর",    # Purva Bhadrapada
    25: "নর",    # Uttara Bhadrapada
    26: "দেব",   # Revati
}

# ---------------------------------------------------------------------------
# VARNA — from Moon Rashi lord
# Sign lord (0-based): Mesha=Mars, Vrishabha=Venus, Mithuna=Mercury,
# Karka=Moon, Simha=Sun, Kanya=Mercury, Tula=Venus, Vrischika=Mars,
# Dhanu=Jupiter, Makara=Saturn, Kumbha=Saturn, Meena=Jupiter
# ---------------------------------------------------------------------------
SIGN_LORD = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
]

PLANET_VARNA = {
    "Sun":     "Kshatriya",
    "Moon":    "Vaishya",
    "Mars":    "Kshatriya",
    "Mercury": "Shudra",
    "Jupiter": "Vipra",
    "Venus":   "Vipra",
    "Saturn":  "Shudra",
    "Rahu":    "Shudra",
    "Ketu":    "Shudra",
}

VARNA_BN = {
    "Brahmin":   "ব্রাহ্মণ",
    "Vipra":     "বিপ্র",
    "Kshatriya": "ক্ষত্রিয়",
    "Vaishya":   "বৈশ্য",
    "Shudra":    "শূদ্র",
}

VARNA_MAP_BN = {
    0: "ক্ষত্রিয়",  # Ashvini
    1: "ক্ষত্রিয়",  # Bharani
    2: "বৈশ্য",      # Krittika
    3: "বৈশ্য",      # Rohini
    4: "শূদ্র",      # Mrigashira
    5: "বৈশ্য",      # Ardra
    6: "বৈশ্য",      # Punarvasu
    7: "বিপ্র",      # Pushya
    8: "বিপ্র",      # Ashlesha
    9: "ক্ষত্রিয়",  # Magha
    10: "ক্ষত্রিয়", # Purva Phalguni
    11: "শূদ্র",     # Uttara Phalguni
    12: "শূদ্র",     # Hasta
    13: "শূদ্র",     # Chitra
    14: "শূদ্র",     # Swati
    15: "বিপ্র",     # Vishakha
    16: "বিপ্র",     # Anuradha
    17: "বিপ্র",     # Jyeshtha
    18: "ক্ষত্রিয়",  # Mula
    19: "ক্ষত্রিয়",  # Purva Ashadha
    20: "শূদ্র",     # Uttara Ashadha
    21: "শূদ্র",     # Shravana
    22: "বৈশ্য",     # Dhanishtha
    23: "বৈশ্য",     # Shatabhisha
    24: "বিপ্র",      # Purva Bhadrapada
    25: "বিপ্র",      # Uttara Bhadrapada
    26: "বিপ্র",      # Revati
}

SPLIT_NAKSHATRA_VARNA_OVERRIDES_BN = {
    2: {
        0: "ক্ষত্রিয়",
        1: "বৈশ্য",
    },
}

# ---------------------------------------------------------------------------
# SHUBHA VARA (lucky days) — from Lagna lord
# ---------------------------------------------------------------------------
LAGNA_LUCKY_DAYS = {
    # Lagna sign index → list of lucky day lords
    0:  ["Sun", "Mars", "Jupiter"],          # Mesha — lord Mars
    1:  ["Venus", "Mercury", "Saturn"],      # Vrishabha — lord Venus
    2:  ["Mercury", "Venus", "Saturn"],      # Mithuna — lord Mercury
    3:  ["Moon", "Mars", "Jupiter"],         # Karka — lord Moon
    4:  ["Sun", "Mars", "Jupiter", "Mercury"], # Simha — lord Sun
    5:  ["Mercury", "Venus", "Saturn"],      # Kanya — lord Mercury
    6:  ["Venus", "Mercury", "Saturn"],      # Tula — lord Venus
    7:  ["Mars", "Sun", "Moon"],             # Vrischika — lord Mars
    8:  ["Jupiter", "Sun", "Mars"],          # Dhanu — lord Jupiter
    9:  ["Saturn", "Venus", "Mercury"],      # Makara — lord Saturn
    10: ["Saturn", "Venus", "Mercury"],      # Kumbha — lord Saturn
    11: ["Jupiter", "Moon", "Mars"],         # Meena — lord Jupiter
}

DAY_NAMES = {
    "Sun":     "Ravivar (Sunday)",
    "Moon":    "Somavar (Monday)",
    "Mars":    "Mangalvar (Tuesday)",
    "Mercury": "Budhvar (Wednesday)",
    "Jupiter": "Brihaspativar (Thursday)",
    "Venus":   "Shukravar (Friday)",
    "Saturn":  "Shanivar (Saturday)",
}

DAY_NAMES_BN = {
    "Sun":     "রবিবার",
    "Moon":    "সোমবার",
    "Mars":    "মঙ্গলবার",
    "Mercury": "বুধবার",
    "Jupiter": "বৃহস্পতিবার",
    "Venus":   "শুক্রবার",
    "Saturn":  "শনিবার",
}

# ---------------------------------------------------------------------------
# SHUBHA RANG (lucky colors) — from planet
# ---------------------------------------------------------------------------
PLANET_COLOR = {
    "Sun":     "Saffron/Orange",
    "Moon":    "White",
    "Mars":    "Red",
    "Mercury": "Green",
    "Jupiter": "Yellow",
    "Venus":   "White/Pink",
    "Saturn":  "Blue/Black",
    "Rahu":    "Smoky/Dark Blue",
    "Ketu":    "Multi-color",
}

PLANET_COLOR_BN = {
    "Sun":     "গেরুয়া/কমলা",
    "Moon":    "সাদা",
    "Mars":    "লাল",
    "Mercury": "সবুজ",
    "Jupiter": "হলুদ",
    "Venus":   "সাদা/গোলাপী",
    "Saturn":  "নীল/কালো",
    "Rahu":    "ধূসর/গাঢ় নীল",
    "Ketu":    "বহুরঙা",
}

# ---------------------------------------------------------------------------
# SHUBHA SANKHYA (lucky numbers) — from planet
# ---------------------------------------------------------------------------
PLANET_NUMBER = {
    "Sun":     1,
    "Moon":    2,
    "Jupiter": 3,
    "Rahu":    4,
    "Mercury": 5,
    "Venus":   6,
    "Ketu":    7,
    "Saturn":  8,
    "Mars":    9,
}

# ---------------------------------------------------------------------------
# NAAM AKSHARA (name syllable) — from Nakshatra Pada
# ---------------------------------------------------------------------------
NAKSHATRA_PADA_SYLLABLE = {
    (0,1):"Chu",(0,2):"Che",(0,3):"Cho",(0,4):"La",
    (1,1):"Li",(1,2):"Lu",(1,3):"Le",(1,4):"Lo",
    (2,1):"A",(2,2):"I",(2,3):"U",(2,4):"E",
    (3,1):"O",(3,2):"Va",(3,3):"Vi",(3,4):"Vu",
    (4,1):"Ve",(4,2):"Vo",(4,3):"Ka",(4,4):"Ki",
    (5,1):"Ku",(5,2):"Gha",(5,3):"Ing",(5,4):"Ja",
    (6,1):"Ke",(6,2):"Ko",(6,3):"Ha",(6,4):"Hi",
    (7,1):"Hu",(7,2):"He",(7,3):"Ho",(7,4):"Da",
    (8,1):"Di",(8,2):"Du",(8,3):"De",(8,4):"Do",
    (9,1):"Ma",(9,2):"Mi",(9,3):"Mu",(9,4):"Me",
    (10,1):"Mo",(10,2):"Ta",(10,3):"Ti",(10,4):"Tu",
    (11,1):"Te",(11,2):"To",(11,3):"Pa",(11,4):"Pi",
    (12,1):"Pu",(12,2):"Sha",(12,3):"Na",(12,4):"Tha",
    (13,1):"Pe",(13,2):"Po",(13,3):"Ra",(13,4):"Ri",
    (14,1):"Ru",(14,2):"Re",(14,3):"Ro",(14,4):"Ta",
    (15,1):"Ti",(15,2):"Tu",(15,3):"Te",(15,4):"To",
    (16,1):"Na",(16,2):"Ni",(16,3):"Nu",(16,4):"Ne",
    (17,1):"No",(17,2):"Ya",(17,3):"Yi",(17,4):"Yu",
    (18,1):"Ye",(18,2):"Yo",(18,3):"Bha",(18,4):"Bhi",
    (19,1):"Bhu",(19,2):"Dha",(19,3):"Pha",(19,4):"Dha",
    (20,1):"Bhe",(20,2):"Bho",(20,3):"Ja",(20,4):"Ji",
    (21,1):"Khi",(21,2):"Khu",(21,3):"Khe",(21,4):"Kho",
    (22,1):"Ga",(22,2):"Gi",(22,3):"Gu",(22,4):"Ge",
    (23,1):"Go",(23,2):"Sa",(23,3):"Si",(23,4):"Su",
    (24,1):"Se",(24,2):"So",(24,3):"Da",(24,4):"Di",
    (25,1):"Du",(25,2):"Tha",(25,3):"Jha",(25,4):"Da",
    (26,1):"De",(26,2):"Do",(26,3):"Cha",(26,4):"Chi",
}

NAKSHATRA_PADA_SYLLABLE_BN = {
    (0,1):"চু",(0,2):"চে",(0,3):"চো",(0,4):"লা",
    (1,1):"লি",(1,2):"লু",(1,3):"লে",(1,4):"লো",
    (2,1):"আ",(2,2):"ই",(2,3):"উ",(2,4):"এ",
    (3,1):"ও",(3,2):"বা",(3,3):"বি",(3,4):"বু",
    (4,1):"বে",(4,2):"বো",(4,3):"কা",(4,4):"কি",
    (5,1):"কু",(5,2):"ঘ",(5,3):"ঙ",(5,4):"ছ",
    (6,1):"কে",(6,2):"কো",(6,3):"হা",(6,4):"হি",
    (7,1):"হু",(7,2):"হে",(7,3):"হো",(7,4):"ডা",
    (8,1):"ডি",(8,2):"ডু",(8,3):"ডে",(8,4):"ডো",
    (9,1):"মা",(9,2):"মি",(9,3):"মু",(9,4):"মে",
    (10,1):"মো",(10,2):"টা",(10,3):"টি",(10,4):"টু",
    (11,1):"টে",(11,2):"টো",(11,3):"পা",(11,4):"পি",
    (12,1):"পু",(12,2):"ষ",(12,3):"ণ",(12,4):"ঠ",
    (13,1):"পে",(13,2):"পো",(13,3):"রা",(13,4):"রি",
    (14,1):"রু",(14,2):"রে",(14,3):"রো",(14,4):"তা",
    (15,1):"তি",(15,2):"তু",(15,3):"তে",(15,4):"তো",
    (16,1):"না",(16,2):"নি",(16,3):"নু",(16,4):"নে",
    (17,1):"নো",(17,2):"যা",(17,3):"যি",(17,4):"যু",
    (18,1):"যে",(18,2):"যো",(18,3):"ভা",(18,4):"ভি",
    (19,1):"ভু",(19,2):"ধা",(19,3):"ফা",(19,4):"ঢা",
    (20,1):"ভে",(20,2):"ভো",(20,3):"জা",(20,4):"জি",
    (21,1):"খি",(21,2):"খু",(21,3):"খে",(21,4):"খো",
    (22,1):"গা",(22,2):"গি",(22,3):"গু",(22,4):"গে",
    (23,1):"গো",(23,2):"সা",(23,3):"সি",(23,4):"সু",
    (24,1):"সে",(24,2):"সো",(24,3):"দা",(24,4):"দি",
    (25,1):"দু",(25,2):"থ",(25,3):"ঝ",(25,4):"ঞ",
    (26,1):"দে",(26,2):"দো",(26,3):"চা",(26,4):"চি",
}

# ---------------------------------------------------------------------------
# PLACE CONFIG
# ---------------------------------------------------------------------------
PLACE_CONFIG = {
    "kolkata":   {"lat": 22.5726, "lon": 88.3639, "timezone": "Asia/Kolkata"},
    "calcutta":  {"lat": 22.5726, "lon": 88.3639, "timezone": "Asia/Kolkata"},
    "howrah":    {"lat": 22.5958, "lon": 88.2636, "timezone": "Asia/Kolkata"},
    "dhaka":     {"lat": 23.8103, "lon": 90.4125, "timezone": "Asia/Dhaka"},
    "mumbai":    {"lat": 19.0760, "lon": 72.8777, "timezone": "Asia/Kolkata"},
    "delhi":     {"lat": 28.6139, "lon": 77.2090, "timezone": "Asia/Kolkata"},
    "chennai":   {"lat": 13.0827, "lon": 80.2707, "timezone": "Asia/Kolkata"},
    "bangalore": {"lat": 12.9716, "lon": 77.5946, "timezone": "Asia/Kolkata"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "timezone": "Asia/Kolkata"},
    "pune":      {"lat": 18.5204, "lon": 73.8567, "timezone": "Asia/Kolkata"},
}


# ===========================================================================
# DATACLASSES
# ===========================================================================

@dataclass(frozen=True)
class Location:
    latitude: float
    longitude: float
    timezone: str


@dataclass(frozen=True)
class PlanetResult:
    name: str
    longitude: float          # absolute sidereal longitude 0–360
    sign: str                 # sign name
    sign_index: int           # 0-based sign index
    degree_in_sign: float     # degrees within sign (0–30)
    minutes_in_sign: int      # minutes portion
    seconds_in_sign: int      # seconds portion
    is_retrograde: bool       # True if retrograde
    house: int                # 1-based house number (from lagna)


@dataclass(frozen=True)
class NakshatraResult:
    index: int          # 0-based (0=Ashwini)
    name: str
    name_bn: str
    pada: int           # 1–4
    lord: str           # nakshatra lord planet
    gana: str
    current_pada_syllable: str
    all_nakshatra_syllables: tuple[str, str, str, str]
    naam_akshara: str   # backwards-compatible alias for current_pada_syllable


@dataclass(frozen=True)
class DashaPeriod:
    planet: str
    start_date: date
    end_date: date
    years: int          # full dasha years
    antardashas: list   # list of AntarDasha


@dataclass(frozen=True)
class AntarDasha:
    planet: str
    start_date: date
    end_date: date
    duration_years: int
    duration_months: int
    duration_days: int


@dataclass
class ChartResult:
    # --- Input echo ---
    dob: date
    birth_time: time
    place: str

    # --- Core astronomical ---
    julian_day: float
    ayanamsa: float

    # --- Lagna ---
    ascendant_longitude: float   # sidereal, absolute
    lagna_sign: str              # sign name
    lagna_sign_index: int        # 0-based
    lagna_degree: float          # degree within sign
    lagna_minutes: int
    lagna_seconds: int

    # --- Moon = Rashi ---
    rashi_sign: str              # Moon's sign
    rashi_sign_index: int

    # --- Nakshatra ---
    nakshatra: NakshatraResult

    # --- Supplementary ---
    varna: str
    varna_bn: str
    gana: str                    # same as nakshatra.gana
    lucky_days: list[str]
    lucky_days_bn: list[str]
    lucky_colors: list[str]
    lucky_colors_bn: list[str]
    lucky_numbers: list[int]
    naam_akshara: str

    # --- Planets ---
    planets: list[PlanetResult]

    # --- Dasha ---
    current_dasha_balance: tuple   # (planet, remaining_years, months, days)
    mahadasha_list: list[DashaPeriod]
    debug_trace: dict[str, Any] | None = None


# ===========================================================================
# HELPERS
# ===========================================================================

def resolve_location(place: str) -> Location:
    key = place.strip().lower()
    cfg = PLACE_CONFIG.get(key)
    if cfg is None:
        raise ValueError(f"Unsupported place: '{place}'. Add to PLACE_CONFIG.")
    return Location(latitude=cfg["lat"], longitude=cfg["lon"], timezone=cfg["timezone"])


def _normalize(lon: float) -> float:
    return lon % 360.0


def _resolve_ayanamsa_mode(ayanamsa_mode: str, custom_ayanamsa_degrees: Optional[float]) -> tuple[str, Optional[int], Optional[float], bool]:
    # Lock the engine to Lahiri sidereal mode so the backend matches the book.
    return (
        "Lahiri Workflow",
        swe.SIDM_LAHIRI,
        None,
        False,
    )


def _sign_index(lon: float) -> int:
    return int(_normalize(lon) // 30)


def _sign_name(lon: float) -> str:
    return ZODIAC_SIGNS[_sign_index(lon)]


def _dms(lon: float) -> tuple[int, int, int]:
    """Return (sign_index, deg_in_sign, minutes, seconds) — actually returns deg, min, sec within sign."""
    pos = _normalize(lon) % 30.0
    deg = int(pos)
    rem = (pos - deg) * 60.0
    mins = int(rem)
    secs = int((rem - mins) * 60.0)
    return deg, mins, secs


def _to_bengali_digits(value: str) -> str:
    digits = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
    return str(value).translate(digits)


def _format_sign_dms_bn(lon: float) -> str:
    lon = _normalize(lon)
    si = _sign_index(lon)
    deg, mins, secs = _dms(lon)
    deg_bn = _to_bengali_digits(f"{deg:02d}")
    min_bn = _to_bengali_digits(f"{mins:02d}")
    sec_bn = _to_bengali_digits(f"{secs:02d}")
    return f"{ZODIAC_SIGNS_BN[si]} {deg_bn}° {min_bn}′ {sec_bn}″"


def _format_sign_compact_bn(lon: float) -> str:
    lon = _normalize(lon)
    si = _sign_index(lon)
    deg, mins, secs = _dms(lon)
    return " | ".join([
        _to_bengali_digits(str(si)),
        _to_bengali_digits(f"{deg:02d}"),
        _to_bengali_digits(f"{mins:02d}"),
        _to_bengali_digits(f"{secs:02d}"),
    ])


def format_sign_dms_bn(lon: float) -> str:
    return _format_sign_dms_bn(lon)


def format_sign_compact_bn(lon: float) -> str:
    return _format_sign_compact_bn(lon)


def _add_days_to_date(d: date, days: float) -> date:
    return d + timedelta(days=days)


def _days_to_ymd(total_days: float) -> tuple[int, int, int]:
    """Convert fractional days to (years, months, days) approximate."""
    years = int(total_days / 365.25)
    rem = total_days - years * 365.25
    months = int(rem / 30.4375)
    days = int(rem - months * 30.4375)
    return years, months, days


def _calendar_ymd_diff(start: date, end: date) -> tuple[int, int, int]:
    """Return a calendar-based year/month/day difference between two dates."""
    years = end.year - start.year
    months = end.month - start.month
    days = end.day - start.day

    if days < 0:
        prev_month_end = end.replace(day=1) - timedelta(days=1)
        days += prev_month_end.day
        months -= 1

    if months < 0:
        months += 12
        years -= 1

    return years, months, days


def calculate_tropical_ascendant_formula(lst_hours: float, lat_deg: float) -> float:
    """Oblique ascension formula for tropical ascendant."""
    import math
    ramc = lst_hours * 15.0 * math.pi / 180.0
    lat_rad = lat_deg * math.pi / 180.0
    eps = 23.45 * math.pi / 180.0  # Obliquity 23d 27m
    y = math.cos(ramc)
    x = -math.sin(ramc) * math.cos(eps) - math.tan(lat_rad) * math.sin(eps)
    asc_rad = math.atan2(y, x)
    return (asc_rad * 180.0 / math.pi) % 360.0


def interpolate_angle(a1: float, a2: float, frac: float) -> float:
    """Interpolate between two angles, handling boundary wrapping at 360 degrees."""
    diff = (a2 - a1) % 360.0
    if diff > 180.0:
        diff -= 360.0
    return (a1 + diff * frac) % 360.0


def _load_ascendant_table(latitude_index: int) -> dict[str, float]:
    latitude_index = max(0, min(60, int(latitude_index)))
    cached = _ASCENDANT_TABLE_CACHE.get(latitude_index)
    if cached is not None:
        return cached

    import json
    from pathlib import Path

    table_path = Path(__file__).parent / "data" / "ascendant_tables" / f"{latitude_index}.json"
    if not table_path.exists():
        _ASCENDANT_TABLE_CACHE[latitude_index] = {}
        return _ASCENDANT_TABLE_CACHE[latitude_index]

    try:
        with open(table_path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        data = {}

    _ASCENDANT_TABLE_CACHE[latitude_index] = data
    return data


def _lookup_time_table_value(table: dict[str, float], target_minutes: float) -> float:
    if not table:
        return 0.0

    entries = sorted(
        ((int(h), int(m), int(s), float(value)) for key, value in table.items() for h, m, s in [tuple(int(part) for part in key.split(":"))]),
        key=lambda item: (item[0], item[1], item[2]),
    )
    if not entries:
        return 0.0

    target_minutes = target_minutes % (24.0 * 60.0)
    target_seconds = target_minutes * 60.0
    timeline = [((h * 3600) + (m * 60) + s, value) for h, m, s, value in entries]

    for index, (seconds, value) in enumerate(timeline):
        if abs(seconds - target_seconds) < 0.5:
            return value

    extended = timeline + [(timeline[0][0] + 24 * 3600, timeline[0][1])]
    for index in range(len(timeline)):
        left_seconds, left_value = extended[index]
        right_seconds, right_value = extended[index + 1]
        if left_seconds <= target_seconds <= right_seconds:
            span = right_seconds - left_seconds
            if span <= 0:
                return left_value
            fraction = (target_seconds - left_seconds) / span
            return interpolate_angle(left_value, right_value, fraction)

    return timeline[-1][1]


def calculate_book_lagna(utc_dt: datetime, latitude: float, longitude: float) -> float:
    """Calculate Lagna using the Lahiri ascendant tables and local sidereal time."""
    jd = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0,
    )
    # Pure sidereal-time approximation from Julian Day; avoids relying on Swiss houses.
    t = (jd - 2451545.0) / 36525.0
    gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * (t ** 2) - (t ** 3) / 38710000.0
    lst_hours = ((gmst % 360.0) / 15.0 + longitude / 15.0) % 24.0

    lat_abs = min(60.0, max(0.0, abs(latitude)))
    lower_lat = int(lat_abs)
    upper_lat = min(60, lower_lat + 1)
    lat_fraction = lat_abs - lower_lat

    lower_table = _load_ascendant_table(lower_lat)
    upper_table = _load_ascendant_table(upper_lat)
    lower_value = _lookup_time_table_value(lower_table, lst_hours * 60.0)
    upper_value = _lookup_time_table_value(upper_table, lst_hours * 60.0)

    return interpolate_angle(lower_value, upper_value, lat_fraction)


_TRADITIONAL_RULES = {}


def _load_traditional_rule(filename: str) -> dict:
    """Load and cache traditional rules JSON config file."""
    if filename in _TRADITIONAL_RULES:
        return _TRADITIONAL_RULES[filename]
    
    import json
    from pathlib import Path
    
    data_dir = Path(__file__).parent / "data" / "traditional_rules"
    file_path = data_dir / filename
    
    if not file_path.exists():
        return {}
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        _TRADITIONAL_RULES[filename] = data
    except Exception:
        return {}
        
    return _TRADITIONAL_RULES[filename]


def get_gan(nakshatra_index: int) -> str:
    """Get Gan from the hardcoded 0-based Nakshatra table."""
    return GAN_MAP_BN.get(int(nakshatra_index), "দেব")


def get_traditional_gana(nakshatra_name: str) -> str:
    """Backward-compatible wrapper for Nakshatra-name callers."""
    try:
        return get_gan(NAKSHATRAS.index(nakshatra_name))
    except ValueError:
        return "দেব"


def get_varna(nakshatra_index: int, rashi_sign_idx: int | None = None) -> str:
    """Get Varna from the hardcoded 0-based Nakshatra table, with border overrides."""
    index = int(nakshatra_index)
    if rashi_sign_idx is not None:
        overrides = SPLIT_NAKSHATRA_VARNA_OVERRIDES_BN.get(index)
        if overrides is not None:
            return overrides.get(int(rashi_sign_idx), VARNA_MAP_BN.get(index, "শূদ্র"))
    return VARNA_MAP_BN.get(index, "শূদ্র")


def get_traditional_varna(rashi_name: str) -> str:
    """Backward-compatible wrapper for callers that still pass a Rashi name."""
    return {
        "Mesha": "ক্ষত্রিয়",
        "Vrishabha": "বৈশ্য",
        "Mithuna": "শূদ্র",
        "Karka": "বিপ্র",
        "Simha": "ক্ষত্রিয়",
        "Kanya": "শূদ্র",
        "Tula": "শূদ্র",
        "Vrischika": "বিপ্র",
        "Dhanu": "ক্ষত্রিয়",
        "Makara": "বৈশ্য",
        "Kumbha": "শূদ্র",
        "Meena": "বিপ্র",
    }.get(rashi_name, "শূদ্র")


def get_traditional_syllables(nakshatra_name: str) -> list[str]:
    """Get traditional 4-syllable list for Nakshatra from static rule file."""
    rules = _load_traditional_rule("naming_rules.json")
    return rules.get(nakshatra_name, ["?", "?", "?", "?"])


def get_traditional_lucky_info(rashi_name: str, nakshatra_name: str) -> tuple[list[str], list[str], list[int]]:
    """Get traditional lucky days, colors, and numbers from static rule file."""
    rules = _load_traditional_rule("lucky_rules.json")
    
    rashi_defaults = rules.get("rashi_lucky_defaults", {}).get(rashi_name, {})
    lucky_days = rashi_defaults.get("lucky_days", ["Wednesday"])
    lucky_colors_r = rashi_defaults.get("lucky_colors", [])
    
    nak_defaults = rules.get("nakshatra_lucky_defaults", {}).get(nakshatra_name, {})
    lucky_colors_n = nak_defaults.get("colors", [])
    lucky_numbers = nak_defaults.get("numbers", [5])
    
    lucky_colors = list(dict.fromkeys(lucky_colors_r + lucky_colors_n))
    if not lucky_colors:
        lucky_colors = ["সবুজ"]
        
    return lucky_days, lucky_colors, lucky_numbers



# ===========================================================================
# NAKSHATRA CALCULATION
# ===========================================================================

def _calc_nakshatra(moon_longitude: float) -> NakshatraResult:
    """Calculate nakshatra from Moon's sidereal longitude using the hardcoded 0-based table."""
    NAK_SPAN = 360.0 / 27.0          # 13.3333...°
    PADA_SPAN = NAK_SPAN / 4.0       # 3.3333...°

    idx = int(moon_longitude / NAK_SPAN) % 27
    position_in_nak = moon_longitude % NAK_SPAN
    pada = int(position_in_nak / PADA_SPAN) + 1   # 1–4

    nak_name = NAKSHATRAS[idx]
    lord = NAKSHATRA_LORD_ORDER[idx % 9]
    gana = get_gan(idx)

    # Traditional syllable lookup remains file-backed for now.
    all_syllables = get_traditional_syllables(nak_name)
    syllable = all_syllables[pada - 1]

    return NakshatraResult(
        index=idx,
        name=nak_name,
        name_bn=NAKSHATRAS_BN[idx],
        pada=pada,
        lord=lord,
        gana=gana,
        current_pada_syllable=syllable,
        all_nakshatra_syllables=tuple(all_syllables),
        naam_akshara=syllable,
    )


# ===========================================================================
# VIMSHOTTARI DASHA CALCULATION
# ===========================================================================

def _calc_dasha(moon_longitude: float, birth_date: date) -> tuple[tuple, list[DashaPeriod]]:
    """
    Calculate complete Vimshottari Dasha timeline.

    Returns:
        balance_info: (planet, years, months, days) — balance of first dasha
        dasha_list:   list of DashaPeriod for all 9 mahadashas
    """
    NAK_SPAN = 360.0 / 27.0

    nak_idx = int(moon_longitude / NAK_SPAN) % 27
    lord_idx_in_sequence = nak_idx % 9            # 0-based index in DASHA_SEQUENCE
    first_lord = NAKSHATRA_LORD_ORDER[nak_idx % 9]

    # Position within nakshatra (0.0 to 1.0)
    position_in_nak = moon_longitude % NAK_SPAN
    fraction_elapsed = position_in_nak / NAK_SPAN
    fraction_remaining = 1.0 - fraction_elapsed

    # Balance of first dasha
    first_dasha_years = DASHA_YEARS[first_lord]
    balance_years_decimal = first_dasha_years * fraction_remaining
    balance_days = balance_years_decimal * 365.25
    bal_y, bal_m, bal_d = _days_to_ymd(balance_days)

    # Build full dasha list starting from birth
    dasha_list = []
    current_start = birth_date

    for i in range(9):
        idx = (lord_idx_in_sequence + i) % 9
        planet = DASHA_SEQUENCE[idx]
        full_years = DASHA_YEARS[planet]

        if i == 0:
            # First dasha: only the balance remains
            dasha_days = balance_days
        else:
            dasha_days = full_years * 365.25

        dasha_end = _add_days_to_date(current_start, dasha_days)

        # Build antardashas for this mahadasha
        antardashas = _calc_antardasha(planet, current_start, dasha_days, i == 0, balance_days, full_years)

        dasha_list.append(DashaPeriod(
            planet=planet,
            start_date=current_start,
            end_date=dasha_end,
            years=full_years,
            antardashas=antardashas,
        ))

        current_start = dasha_end

    balance_info = (first_lord, bal_y, bal_m, bal_d)
    return balance_info, dasha_list


def _calc_antardasha(
    md_planet: str,
    md_start: date,
    md_total_days: float,
    is_first: bool,
    balance_days: float,
    md_full_years: int,
) -> list[AntarDasha]:
    """
    Calculate all 9 antardashas within one mahadasha.

    Formula: AD_days = (MD_years × AD_years / 120) × 365.25
    For first (balance) dasha, scale proportionally.
    """
    # Find starting position in sequence for this MD planet
    md_seq_idx = DASHA_SEQUENCE.index(md_planet)

    antardashas = []
    current_start = md_start

    for i in range(9):
        ad_idx = (md_seq_idx + i) % 9
        ad_planet = DASHA_SEQUENCE[ad_idx]
        ad_years = DASHA_YEARS[ad_planet]

        # Full AD duration = (MD_full_years × AD_years / 120) years
        full_ad_days = (md_full_years * ad_years / 120.0) * 365.25

        if is_first:
            # Scale down proportionally to balance
            ad_days = full_ad_days * (balance_days / (md_full_years * 365.25))
        else:
            ad_days = full_ad_days

        ad_end = _add_days_to_date(current_start, ad_days)

        y, m, d = _calendar_ymd_diff(current_start, ad_end)

        antardashas.append(AntarDasha(
            planet=ad_planet,
            start_date=current_start,
            end_date=ad_end,
            duration_years=y,
            duration_months=m,
            duration_days=d,
        ))

        current_start = ad_end

    return antardashas


# ===========================================================================
# LUCKY FIELDS
# ===========================================================================

def _calc_lucky_fields(lagna_sign_idx: int, rashi_sign_idx: int, nakshatra: NakshatraResult):
    """Calculate Shubha Vara, Rang, Sankhya, Varna using Nakshatra-first lookup tables."""
    varna = get_varna(nakshatra.index, rashi_sign_idx)
    varna_bn = VARNA_BN.get(varna, varna)

    # Janma Rashi lord and Nakshatra lord
    rashi_lord = SIGN_LORD[rashi_sign_idx]
    nak_lord = nakshatra.lord
    
    # Combined lords for lucky attributes (unique, ordered)
    lucky_lords = list(dict.fromkeys([rashi_lord, nak_lord]))

    # Lucky days — from Janma Rashi & Nakshatra lords
    lucky_days = [DAY_NAMES.get(p, "No fixed day") for p in lucky_lords]
    lucky_days_bn = [DAY_NAMES_BN.get(p, "নির্দিষ্ট বার নেই") for p in lucky_lords]

    # Lucky colors — from Janma Rashi & Nakshatra lords
    lucky_colors = [PLANET_COLOR[p] for p in lucky_lords]
    lucky_colors_bn = [PLANET_COLOR_BN[p] for p in lucky_lords]

    # Lucky numbers — from Janma Rashi & Nakshatra lords
    lucky_numbers = sorted(set(PLANET_NUMBER[p] for p in lucky_lords))

    return varna, varna_bn, lucky_days, lucky_days_bn, lucky_colors, lucky_colors_bn, lucky_numbers


def _build_debug_trace(
    *,
    location: Location,
    dob: date,
    birth_time: time,
    ayanamsa_mode: str,
    sid_mode: Optional[int],
    ayanamsa_label: str,
    custom_ayanamsa_degrees: Optional[float],
    uses_manual_offset: bool,
    true_moon: bool,
    flags: int,
    jd: float,
    utc_dt: datetime,
    local_dt: datetime,
    ayanamsa: float,
    tropical_moon_longitude: float,
    sidereal_moon_longitude: float,
    final_moon_longitude: float,
    moon_source: str,
    moon_flags: int,
    override_moon_longitude: Optional[float],
    moon_correction_trace: dict[str, Any] | None,
    rashi_si: int,
    moon_sign: str,
    moon_degree_in_sign: float,
    nakshatra: NakshatraResult,
    planet_trace: list[dict[str, Any]],
) -> dict[str, Any]:
    nak_span = 360.0 / 27.0
    pada_span = nak_span / 4.0
    position_in_nak = final_moon_longitude % nak_span
    fraction_elapsed = position_in_nak / nak_span
    fraction_remaining = 1.0 - fraction_elapsed

    return {
        "inputs": {
            "dob": dob.isoformat(),
            "birth_time": birth_time.isoformat(),
            "place": location,
            "timezone": location.timezone,
            "local_birth_datetime": local_dt.isoformat(),
            "utc_birth_datetime": utc_dt.isoformat(),
            "utc_birth_time_hours": round(
                utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0,
                6,
            ),
        },
        "swisseph": {
            "julday_function": "swe.julday",
            "julian_day": round(jd, 6),
            "set_sid_mode": "manual tropical offset" if uses_manual_offset else "swe.set_sid_mode(...)",
            "ayanamsa_label": ayanamsa_label,
            "requested_ayanamsa_mode": ayanamsa_mode,
            "sid_mode_constant": sid_mode,
            "custom_ayanamsa_degrees": custom_ayanamsa_degrees,
            "manual_offset_mode": uses_manual_offset,
            "get_ayanamsa_function": "swe.get_ayanamsa_ut",
            "ayanamsa_ut": round(ayanamsa, 6),
            "planet_function": "swe.calc_ut",
            "planet_flags": flags,
            "moon_flags": moon_flags,
            "moon_source": moon_source,
            "true_moon_enabled": true_moon,
        },
        "moon_chain": {
            "tropical_moon_longitude": round(tropical_moon_longitude, 6),
            "sidereal_moon_longitude_from_swe": round(sidereal_moon_longitude, 6),
            "nirayana_from_tropical_minus_ayanamsa": round(_normalize(tropical_moon_longitude - ayanamsa), 6),
            "final_nirayana_moon_longitude": round(final_moon_longitude, 6),
            "override_moon_longitude": None if override_moon_longitude is None else round(override_moon_longitude, 6),
            "correction_trace": moon_correction_trace,
            "correction_or_interpolation_applied": "override_moon_longitude"
            if override_moon_longitude is not None
            else ("true_moon_flag" if true_moon else "none"),
        },
        "rashi": {
            "sign_index": rashi_si,
            "sign_name_en": moon_sign,
            "sign_name_bn": ZODIAC_SIGNS_BN[rashi_si],
            "degree_in_sign": round(moon_degree_in_sign, 4),
            "degree_dms_bn": _format_sign_dms_bn(final_moon_longitude),
        },
        "nakshatra": {
            "span_degrees": nak_span,
            "pada_span_degrees": pada_span,
            "position_in_nakshatra": round(position_in_nak, 6),
            "fraction_elapsed": round(fraction_elapsed, 6),
            "fraction_remaining": round(fraction_remaining, 6),
            "index": nakshatra.index,
            "name_en": nakshatra.name,
            "name_bn": nakshatra.name_bn,
            "pada": nakshatra.pada,
            "lord": nakshatra.lord,
            "gana": nakshatra.gana,
            "current_pada_syllable": nakshatra.current_pada_syllable,
            "all_nakshatra_syllables": list(nakshatra.all_nakshatra_syllables),
        },
        "formatted_bengali_output": {
            "moon_label_bn": f"{moon_sign} / {ZODIAC_SIGNS_BN[rashi_si]}",
            "moon_dms_bn": _format_sign_dms_bn(final_moon_longitude),
            "nakshatra_bn": nakshatra.name_bn,
            "nakshatra_pada_bn": _to_bengali_digits(str(nakshatra.pada)),
            "naam_akshara_bn": nakshatra.current_pada_syllable,
        },
        "planet_pipeline": planet_trace,
    }


# ===========================================================================
# MAIN CALCULATE FUNCTION
# ===========================================================================

def calculate_chart(
    dob: date,
    birth_time: time,
    place: str,
    ayanamsa_mode: str = "lahiri",
    custom_ayanamsa_degrees: Optional[float] = None,
    true_moon: bool = True,
    override_moon_longitude: Optional[float] = None,
    override_ascendant_longitude: Optional[float] = None,
    debug_trace: bool = False,
) -> ChartResult:
    """
    Calculate complete Vedic/Bengali birth chart.

    Args:
        dob:        Date of birth
        birth_time: Time of birth (local time of the place)
        place:      City name (must be in PLACE_CONFIG)

    Returns:
        ChartResult with all fields filled
    """
    location = resolve_location(place)

    # --- Convert local birth time to UTC ---
    tz = ZoneInfo(location.timezone)
    birth_dt = datetime.combine(dob, birth_time, tzinfo=tz)
    utc_dt = birth_dt.astimezone(ZoneInfo("UTC"))

    # --- Julian Day ---
    ayanamsa_label, sid_mode, manual_ayanamsa, uses_manual_offset = _resolve_ayanamsa_mode(
        ayanamsa_mode,
        custom_ayanamsa_degrees,
    )
    if not uses_manual_offset:
        swe.set_sid_mode(sid_mode)
    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0,
    )

    # --- Ayanamsa ---
    ayanamsa = manual_ayanamsa if manual_ayanamsa is not None else swe.get_ayanamsa_ut(jd)

    # --- Flags: sidereal ---
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    if not uses_manual_offset:
        flags |= swe.FLG_SIDEREAL

    def project_longitude(lon: float) -> float:
        if uses_manual_offset:
            return _normalize(lon - ayanamsa)
        return _normalize(lon)

    # --- Calculate planets ---
    raw_planets: list[PlanetResult] = []
    planet_trace: list[dict[str, Any]] = []
    moon_correction_trace: dict[str, Any] | None = None
    for pname, pid in PLANETS:
        # For Moon, prefer TRUE Moon positional flag
        pflags = flags
        if pname == "Moon" and true_moon:
            pflags = flags | swe.FLG_TRUEPOS
        data = swe.calc_ut(jd, pid, pflags)
        lon = project_longitude(data[0][0])
        if pname == "Moon":
            moon_correction_trace = {"enabled": False, "source": "swiss_ephemeris_true"}
        speed = data[0][3]
        is_retro = speed < 0.0 and pname not in ("Rahu", "Ketu")
        # Rahu/Ketu are always technically retrograde in mean node mode — don't flag them
        si = _sign_index(lon)
        deg, mins, secs = _dms(lon)
        raw_planets.append(PlanetResult(
            name=pname,
            longitude=round(lon, 6),
            sign=ZODIAC_SIGNS[si],
            sign_index=si,
            degree_in_sign=round(lon % 30.0, 4),
            minutes_in_sign=mins,
            seconds_in_sign=secs,
            is_retrograde=is_retro,
            house=0,   # placeholder, filled after lagna
        ))
        if debug_trace:
            planet_trace.append(
                {
                    "planet": pname,
                    "ephemeris_id": pid,
                    "flags": pflags,
                    "longitude": round(lon, 6),
                    "speed": round(speed, 9),
                    "sign_index": si,
                    "sign_name": ZODIAC_SIGNS[si],
                    "degree_in_sign": round(lon % 30.0, 4),
                    "dms": f"{deg}° {mins:02d}' {secs:02d}\"",
                    "is_retrograde": is_retro,
                }
            )

    # --- Ketu = Rahu + 180° ---
    rahu = next(p for p in raw_planets if p.name == "Rahu")
    ketu_lon = _normalize(rahu.longitude + 180.0)
    si_k = _sign_index(ketu_lon)
    deg_k, min_k, sec_k = _dms(ketu_lon)
    raw_planets.append(PlanetResult(
        name="Ketu",
        longitude=round(ketu_lon, 6),
        sign=ZODIAC_SIGNS[si_k],
        sign_index=si_k,
        degree_in_sign=round(ketu_lon % 30.0, 4),
        minutes_in_sign=min_k,
        seconds_in_sign=sec_k,
        is_retrograde=False,
        house=0,
    ))

    # --- Lagna (Ascendant) — Lahiri ascendant tables ---
    asc_lon = calculate_book_lagna(utc_dt, location.latitude, location.longitude)
    if override_ascendant_longitude is not None:
        asc_lon = _normalize(override_ascendant_longitude)
    lagna_si = _sign_index(asc_lon)
    lagna_deg, lagna_min, lagna_sec = _dms(asc_lon)

    # --- Assign house to each planet (Whole Sign from Lagna) ---
    planets_with_houses = []
    for p in raw_planets:
        house = ((p.sign_index - lagna_si) % 12) + 1
        planets_with_houses.append(PlanetResult(
            name=p.name,
            longitude=p.longitude,
            sign=p.sign,
            sign_index=p.sign_index,
            degree_in_sign=p.degree_in_sign,
            minutes_in_sign=p.minutes_in_sign,
            seconds_in_sign=p.seconds_in_sign,
            is_retrograde=p.is_retrograde,
            house=house,
        ))

    sidereal_moon_longitude = next(p.longitude for p in planets_with_houses if p.name == "Moon")
    tropical_moon_longitude = 0.0
    moon_source = "Dynamic PM Bagchi formula"
    moon_flags = flags | (swe.FLG_TRUEPOS if true_moon else 0)
    if debug_trace:
        tropical_flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        if true_moon:
            tropical_flags |= swe.FLG_TRUEPOS
        tropical_moon_data = swe.calc_ut(jd, swe.MOON, tropical_flags)
        tropical_moon_longitude = _normalize(tropical_moon_data[0][0])

    # --- Moon = Rashi ---
    if override_moon_longitude is not None:
        override_moon_longitude = _normalize(override_moon_longitude)
        for idx, p in enumerate(planets_with_houses):
            if p.name == "Moon":
                si_o = _sign_index(override_moon_longitude)
                deg_o, min_o, sec_o = _dms(override_moon_longitude)
                planets_with_houses[idx] = PlanetResult(
                    name=p.name,
                    longitude=round(override_moon_longitude, 6),
                    sign=ZODIAC_SIGNS[si_o],
                    sign_index=si_o,
                    degree_in_sign=round(override_moon_longitude % 30.0, 4),
                    minutes_in_sign=min_o,
                    seconds_in_sign=sec_o,
                    is_retrograde=p.is_retrograde,
                    house=p.house,
                )
                break
    moon = next(p for p in planets_with_houses if p.name == "Moon")
    final_moon_longitude = moon.longitude
    rashi_si = moon.sign_index

    # --- Nakshatra from Moon ---
    nakshatra = _calc_nakshatra(moon.longitude)

    # --- Dasha ---
    balance_info, dasha_list = _calc_dasha(moon.longitude, dob)

    # --- Lucky fields ---
    varna, varna_bn, lucky_days, lucky_days_bn, lucky_colors, lucky_colors_bn, lucky_numbers = \
        _calc_lucky_fields(lagna_si, rashi_si, nakshatra)

    return ChartResult(
        dob=dob,
        birth_time=birth_time,
        place=place,
        julian_day=round(jd, 6),
        ayanamsa=round(ayanamsa, 6),
        ascendant_longitude=round(asc_lon, 6),
        lagna_sign=ZODIAC_SIGNS[lagna_si],
        lagna_sign_index=lagna_si,
        lagna_degree=lagna_deg,
        lagna_minutes=lagna_min,
        lagna_seconds=lagna_sec,
        rashi_sign=moon.sign,
        rashi_sign_index=rashi_si,
        nakshatra=nakshatra,
        varna=varna,
        varna_bn=varna_bn,
        gana=nakshatra.gana,
        lucky_days=lucky_days,
        lucky_days_bn=lucky_days_bn,
        lucky_colors=lucky_colors,
        lucky_colors_bn=lucky_colors_bn,
        lucky_numbers=lucky_numbers,
        naam_akshara=nakshatra.naam_akshara,
        planets=planets_with_houses,
        current_dasha_balance=balance_info,
        mahadasha_list=dasha_list,
        debug_trace=(
            _build_debug_trace(
                location=location,
                dob=dob,
                birth_time=birth_time,
                ayanamsa_mode=ayanamsa_mode,
                sid_mode=sid_mode,
                ayanamsa_label=ayanamsa_label,
                custom_ayanamsa_degrees=manual_ayanamsa,
                uses_manual_offset=uses_manual_offset,
                true_moon=true_moon,
                flags=flags,
                jd=jd,
                utc_dt=utc_dt,
                local_dt=birth_dt,
                ayanamsa=ayanamsa,
                tropical_moon_longitude=tropical_moon_longitude,
                sidereal_moon_longitude=sidereal_moon_longitude,
                final_moon_longitude=final_moon_longitude,
                moon_source=moon_source,
                moon_flags=moon_flags,
                override_moon_longitude=override_moon_longitude,
                moon_correction_trace=moon_correction_trace,
                rashi_si=rashi_si,
                moon_sign=moon.sign,
                moon_degree_in_sign=moon.degree_in_sign,
                nakshatra=nakshatra,
                planet_trace=planet_trace,
            )
            if debug_trace
            else None
        ),
    )


# ===========================================================================
# DISPLAY / PRINT
# ===========================================================================

def print_chart(result: ChartResult) -> None:
    """Print full chart in traditional Bengali astrology format."""
    print("=" * 65)
    print("          জন্মকুণ্ডলী / BIRTH CHART")
    print("=" * 65)

    if result.debug_trace:
        trace = result.debug_trace
        inputs = trace.get("inputs", {})
        swisseph = trace.get("swisseph", {})
        moon_chain = trace.get("moon_chain", {})
        rashi = trace.get("rashi", {})
        nakshatra = trace.get("nakshatra", {})
        formatted = trace.get("formatted_bengali_output", {})

        print("─" * 65)
        print("  INTERMEDIATE CALCULATION TRACE")
        print("─" * 65)
        print(f"  Local birth datetime        : {inputs.get('local_birth_datetime')}")
        print(f"  UTC converted birth datetime: {inputs.get('utc_birth_datetime')}")
        print(f"  UTC time hours for julday   : {inputs.get('utc_birth_time_hours')}")
        print(f"  Swiss Ephemeris julday      : {swisseph.get('julday_function')} -> {swisseph.get('julian_day')}")
        print(f"  Ayanamsa mode requested     : {swisseph.get('requested_ayanamsa_mode')}")
        print(f"  Exact sidereal mode         : {swisseph.get('set_sid_mode')}")
        print(f"  Ayanamsa value used         : {swisseph.get('ayanamsa_ut')}")
        print(f"  Moon source                 : {swisseph.get('moon_source')}")
        print(f"  Moon flags                  : {swisseph.get('moon_flags')}")
        print(f"  Tropical Moon longitude     : {moon_chain.get('tropical_moon_longitude')}")
        print(f"  Sidereal Moon from swe      : {moon_chain.get('sidereal_moon_longitude_from_swe')}")
        print(f"  Nirayana from trop-ayanamsa  : {moon_chain.get('nirayana_from_tropical_minus_ayanamsa')}")
        print(f"  Final Nirayana Moon         : {moon_chain.get('final_nirayana_moon_longitude')}")
        print(f"  Moon correction applied     : {moon_chain.get('correction_or_interpolation_applied')}")
        print(f"  Rashi sign index            : {rashi.get('sign_index')} ({rashi.get('sign_name_bn')})")
        print(f"  Degree inside sign          : {rashi.get('degree_in_sign')}")
        print(f"  DMS Bengali                 : {rashi.get('degree_dms_bn')}")
        print(f"  Nakshatra index             : {nakshatra.get('index')} ({nakshatra.get('name_bn')})")
        print(f"  Nakshatra pada              : {nakshatra.get('pada')}")
        print(f"  Nakshatra position in span  : {nakshatra.get('position_in_nakshatra')}")
        print(f"  Nakshatra fraction elapsed  : {nakshatra.get('fraction_elapsed')}")
        print(f"  Nakshatra fraction remaining: {nakshatra.get('fraction_remaining')}")
        print(f"  Nakshatra lord              : {nakshatra.get('lord')}")
        print(f"  Current syllable            : {nakshatra.get('current_pada_syllable')}")
        print(f"  All syllables               : {', '.join(nakshatra.get('all_nakshatra_syllables', []))}")
        print(f"  Final Bengali Moon label    : {formatted.get('moon_label_bn')}")
        print(f"  Final Bengali Moon DMS      : {formatted.get('moon_dms_bn')}")
        print(f"  Final Bengali Nakshatra     : {formatted.get('nakshatra_bn')}")
        print(f"  Final Bengali Naam Akshara  : {formatted.get('naam_akshara_bn')}")
        print()
        if trace.get("planet_pipeline"):
            print("  Planet pipeline snapshots:")
            for planet in trace["planet_pipeline"]:
                print(
                    f"    - {planet['planet']}: lon={planet['longitude']} "
                    f"sign={planet['sign_name']} deg={planet['degree_in_sign']} "
                    f"flags={planet['flags']} retro={planet['is_retrograde']}"
                )
            print()
    print(f"জন্ম তারিখ : {result.dob.strftime('%d %B %Y')}")
    print(f"জন্ম সময়  : {result.birth_time.strftime('%I:%M %p')} (IST)")
    print(f"জন্মস্থান  : {result.place.title()}")
    print()

    print("─" * 65)
    print("  মূল তথ্য / CORE DATA")
    print("─" * 65)
    print(f"  লগ্ন (Lagna)    : {result.lagna_sign} ({ZODIAC_SIGNS_BN[result.lagna_sign_index]})"
          f"  {result.lagna_degree}°{result.lagna_minutes}'{result.lagna_seconds}\"")
    print(f"  রাশি (Rashi)    : {result.rashi_sign} ({ZODIAC_SIGNS_BN[result.rashi_sign_index]})"
          f"  [Moon sign]")
    print(f"  নক্ষত্র          : {result.nakshatra.name} ({result.nakshatra.name_bn})"
          f"  পাদ {result.nakshatra.pada}")
    print(f"  নক্ষত্র স্বামী   : {result.nakshatra.lord}")
    print(f"  শুভ নামের অক্ষর : {result.nakshatra.current_pada_syllable} (প্রধান)")
    print(f"  অন্যান্য অক্ষর   : {', '.join(result.nakshatra.all_nakshatra_syllables)}")
    print(f"  গণ              : {result.gana}")
    print(f"  বর্ণ             : {result.varna} ({result.varna_bn})")
    print(f"  নামের আদ্যাক্ষর : {result.naam_akshara}")
    print()

    print("─" * 65)
    print("  শুভ তথ্য / LUCKY INFO")
    print("─" * 65)
    print(f"  শুভ বার    : {', '.join(result.lucky_days_bn)}")
    print(f"  শুভ রং     : {', '.join(result.lucky_colors_bn)}")
    print(f"  শুভ সংখ্যা : {', '.join(map(str, result.lucky_numbers))}")
    print()

    print("─" * 65)
    print("  গ্রহ স্থিতি / PLANETARY POSITIONS")
    print("─" * 65)
    print(f"  {'Planet':<10} {'Sign':<12} {'Deg':<8} {'House':<6} {'Retro'}")
    print(f"  {'------':<10} {'----':<12} {'---':<8} {'-----':<6} {'-----'}")
    for p in result.planets:
        retro = "(R)" if p.is_retrograde else "   "
        deg_str = f"{int(p.degree_in_sign)}°{p.minutes_in_sign}'{p.seconds_in_sign}\""
        print(f"  {p.name:<10} {p.sign:<12} {deg_str:<8} {p.house:<6} {retro}")
    print()

    print("─" * 65)
    print("  বিমশোত্তরী দশা / VIMSHOTTARI DASHA")
    print("─" * 65)
    bal = result.current_dasha_balance
    print(f"  Current Dasha Balance: {bal[0]} — {bal[1]}y {bal[2]}m {bal[3]}d")
    print()
    print(f"  {'Planet':<12} {'Start':<14} {'End':<14} {'Years'}")
    print(f"  {'------':<12} {'-----':<14} {'---':<14} {'-----'}")
    for d in result.mahadasha_list:
        print(f"  {d.planet:<12} {str(d.start_date):<14} {str(d.end_date):<14} {d.years}")
    print()

    print("─" * 65)
    print("  অন্তর্দশা / ANTARDASHA  (under first Mahadasha)")
    print("─" * 65)
    if result.mahadasha_list:
        first_md = result.mahadasha_list[0]
        print(f"  Mahadasha: {first_md.planet} ({first_md.start_date} → {first_md.end_date})")
        print(f"  {'AD Planet':<12} {'Start':<14} {'End':<14} {'Duration'}")
        print(f"  {'---------':<12} {'-----':<14} {'---':<14} {'--------'}")
        for ad in first_md.antardashas:
            dur = f"{ad.duration_years}y {ad.duration_months}m {ad.duration_days}d"
            print(f"  {ad.planet:<12} {str(ad.start_date):<14} {str(ad.end_date):<14} {dur}")
    print("=" * 65)

