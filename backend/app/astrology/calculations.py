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
# TRADITIONAL KOSHTI BOOK RULES (36 CONDITIONS)
# Maps (rashi_index, nakshatra_index) -> {"gan": "...", "varna": "..."}
#
# *** AUDITED against Kaka Babu's পঞ্জিকা book (2026-06-06) ***
# This table is the SINGLE SOURCE OF TRUTH for both Gan and Varna.
# For নক্ষত্র that span two রাশি (e.g. পূর্বভাদ্রপদ in কুম্ভ vs মীন),
# each (rashi, nakshatra) pair has its own definitive row.
# "মতান্তরে" entries resolved per Kaka Babu's preference.
# ---------------------------------------------------------------------------
BOOK_KOSHTI_RULES: dict[tuple[int, int], dict[str, str]] = {
    # ১. মেষ রাশি (Mesha - Index 0)
    (0, 0): {"gan": "দেবগণ", "varna": "ক্ষত্রিয়বর্ণ"},     # অশ্বিনী
    (0, 1): {"gan": "নরগণ", "varna": "ক্ষত্রিয়বর্ণ"},     # ভরণী
    (0, 2): {"gan": "রাক্ষসগণ", "varna": "ক্ষত্রিয়বর্ণ"},   # কৃত্তিকা

    # ২. বৃষ রাশি (Vrishabha - Index 1)
    (1, 2): {"gan": "রাক্ষসগণ", "varna": "বৈশ্যবর্ণ"},     # কৃত্তিকা
    (1, 3): {"gan": "নরগণ", "varna": "বৈশ্যবর্ণ"},     # রোহিণী
    (1, 4): {"gan": "দেবগণ", "varna": "বৈশ্যবর্ণ"},     # মৃগশিরা

    # ৩. মিথুন রাশি (Mithuna - Index 2)
    (2, 4): {"gan": "দেবগণ", "varna": "শূদ্রবর্ণ"},     # মৃগশিরা
    (2, 5): {"gan": "নরগণ", "varna": "শূদ্রবর্ণ"},     # আর্দ্রা
    (2, 6): {"gan": "দেবগণ", "varna": "বৈশ্যবর্ণ"},    # পুনর্বসু

    # ৪. কর্কট রাশি (Karka - Index 3)
    (3, 6): {"gan": "দেবগণ", "varna": "বিপ্রবর্ণ"},     # পুনর্বসু
    (3, 7): {"gan": "দেবগণ", "varna": "বিপ্রবর্ণ"},     # পুষ্যা
    (3, 8): {"gan": "রাক্ষসগণ", "varna": "বিপ্রবর্ণ"},   # অশ্লেষা

    # ৫. সিংহ রাশি (Simha - Index 4)
    (4, 9): {"gan": "রাক্ষসগণ", "varna": "ক্ষত্রিয়বর্ণ"},   # মঘা
    (4, 10): {"gan": "নরগণ", "varna": "ক্ষত্রিয়বর্ণ"},    # পূর্বফাল্গুনী
    (4, 11): {"gan": "নরগণ", "varna": "ক্ষত্রিয়বর্ণ"},    # উত্তরফাল্গুনী

    # ৬. কন্যা রাশি (Kanya - Index 5)
    (5, 11): {"gan": "নরগণ", "varna": "শূদ্রবর্ণ"},     # উত্তরফাল্গুনী
    (5, 12): {"gan": "দেবগণ", "varna": "শূদ্রবর্ণ"},     # হস্তা
    (5, 13): {"gan": "রাক্ষসগণ", "varna": "ক্ষত্রিয়বর্ণ"},  # চিত্রা (কাকাবাবু: ক্ষত্রিয়বর্ণ; মতান্তরে শূদ্রবর্ণ)

    # ৭. তুলা রাশি (Tula - Index 6)
    (6, 13): {"gan": "রাক্ষসগণ", "varna": "শূদ্রবর্ণ"},     # চিত্রা (কাকাবাবু: শূদ্রবর্ণ; মতান্তরে ক্ষত্রিয়বর্ণ)
    (6, 14): {"gan": "দেবগণ", "varna": "শূদ্রবর্ণ"},     # স্বাতী
    (6, 15): {"gan": "রাক্ষসগণ", "varna": "ক্ষত্রিয়বর্ণ"},  # বিশাখা (কাকাবাবু: ক্ষত্রিয়বর্ণ; মতান্তরে শূদ্রবর্ণ)

    # ৮. বৃশ্চিক রাশি (Vrischika - Index 7)
    (7, 15): {"gan": "রাক্ষসগণ", "varna": "বিপ্রবর্ণ"},    # বিশাখা
    (7, 16): {"gan": "দেবগণ", "varna": "বিপ্রবর্ণ"},     # অনুরাধা
    (7, 17): {"gan": "রাক্ষসগণ", "varna": "বিপ্রবর্ণ"},   # জ্যেষ্ঠা

    # ৯. ধনু রাশি (Dhanu - Index 8)
    (8, 18): {"gan": "রাক্ষসগণ", "varna": "ক্ষত্রিয়বর্ণ"},   # মূলা
    (8, 19): {"gan": "নরগণ", "varna": "ক্ষত্রিয়বর্ণ"},    # পূর্বাষাঢ়া
    (8, 20): {"gan": "নরগণ", "varna": "ক্ষত্রিয়বর্ণ"},    # উত্তরাষাঢ়া

    # ১০. মকর রাশি (Makara - Index 9)
    (9, 20): {"gan": "নরগণ", "varna": "বৈশ্যবর্ণ"},     # উত্তরাষাঢ়া
    (9, 21): {"gan": "দেবগণ", "varna": "বৈশ্যবর্ণ"},     # শ্রবণা
    (9, 22): {"gan": "রাক্ষসগণ", "varna": "শূদ্রবর্ণ"},   # ধনিষ্ঠা (কাকাবাবু: শূদ্রবর্ণ)

    # ১১. কুম্ভ রাশি (Kumbha - Index 10)
    (10, 22): {"gan": "রাক্ষসগণ", "varna": "শূদ্রবর্ণ"},   # ধনিষ্ঠা
    (10, 23): {"gan": "রাক্ষসগণ", "varna": "শূদ্রবর্ণ"},   # শতভিষা
    (10, 24): {"gan": "নরগণ", "varna": "বৈশ্যবর্ণ"},     # পূর্বভাদ্রপদ (কাকাবাবু: বৈশ্যবর্ণ)

    # ১২. মীন রাশি (Meena - Index 11)
    (11, 24): {"gan": "নরগণ", "varna": "বিপ্রবর্ণ"},     # পূর্বভাদ্রপদ
    (11, 25): {"gan": "নরগণ", "varna": "বিপ্রবর্ণ"},     # উত্তরভাদ্রপদ
    (11, 26): {"gan": "দেবগণ", "varna": "বিপ্রবর্ণ"},     # রেবতী
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

VARNA_BN = {
    "Brahmin":   "ব্রাহ্মণ",
    "Vipra":     "বিপ্র",
    "Kshatriya": "ক্ষত্রিয়",
    "Vaishya":   "বৈশ্য",
    "Shudra":    "শূদ্র",
}

# --- KAKA BABU'S DEFINITIVE LAGNA-BASED RULES MATRIX ---
# Maps 0-based Lagna Index to its exact book valuations
KAKA_LAGNA_RULES = {
    0: {
        "shubh_bar": "রবি, সোম, মঙ্গল, বৃহস্পতিবার",
        "ashubh_bar": "বুধ, শনি",
        "shubh_rong": "সাদা, লাল, হলুদ, তামাটে",
        "shubh_sonkha": "১, ২, ৩, ৯"
    },
    1: {
        "shubh_bar": "বুধ, শুক্র, শনিবার",
        "ashubh_bar": "রবি, বৃহস্পতিবার",
        "shubh_rong": "সবুজ, নীলাভ সাদা, হলুদ",
        "shubh_sonkha": "৫, ৬, ৮"
    },
    2: {
        "shubh_bar": "বুধ, শুক্র, শনিবার",
        "ashubh_bar": "সোম, মঙ্গলবার",
        "shubh_rong": "সবুজ, নীলাভ সাদা, হলুদ",
        "shubh_sonkha": "৫, ৬, ৮"
    },
    3: {
        "shubh_bar": "সোম, মঙ্গল, বৃহস্পতিবার",
        "ashubh_bar": "শনিবার",
        "shubh_rong": "সাদা, লাল, হলুদ",
        "shubh_sonkha": "২, ৩, ৯"
    },
    4: {
        "shubh_bar": "রবি, মঙ্গল, বৃহস্পতিবার",
        "ashubh_bar": "শুক্র, শনি",
        "shubh_rong": "তামাটে, লাল, হলুদ",
        "shubh_sonkha": "১, ৩, ৯"
    },
    5: {
        "shubh_bar": "বুধ, শুক্র, শনিবার",
        "ashubh_bar": "সোম, মঙ্গলবার",
        "shubh_rong": "সবুজ, নীলাভ সাদা, নীল",
        "shubh_sonkha": "৫, ৬, ৮"
    },
    6: {
        "shubh_bar": "বুধ, শুক্র, শনিবার",
        "ashubh_bar": "রবি, বৃহস্পতিবার",
        "shubh_rong": "নীলাভ সাদা, নীল, সবুজ",
        "shubh_sonkha": "৫, ৬, ৮"
    },
    7: {
        "shubh_bar": "রবি, সোম, মঙ্গল, বৃহস্পতিবার",
        "ashubh_bar": "বুধ, শনি",
        "shubh_rong": "লাল, সাদা, তামাটে, হলুদ",
        "shubh_sonkha": "১, ২, ৩, ৯"
    },
    8: {
        "shubh_bar": "রবি, মঙ্গল, বৃহস্পতিবার",
        "ashubh_bar": "শুক্র, শনি",
        "shubh_rong": "হলুদ, লাল, তামাটে",
        "shubh_sonkha": "১, ৩, ৯"
    },
    9: {
        "shubh_bar": "বুধ, শুক্র, শনিবার",
        "ashubh_bar": "রবি, বৃহস্পতিবার",
        "shubh_rong": "নীল, নীলাভ সাদা, সবুজ",
        "shubh_sonkha": "৫, ৬, ৮"
    },
    10: {
        "shubh_bar": "বুধ, শুক্র, শনিবার",
        "ashubh_bar": "সোম, মঙ্গলবার",
        "shubh_rong": "নীল, নীলাভ সাদা, সবুজ",
        "shubh_sonkha": "৫, ৬, ৮"
    },
    11: {
        "shubh_bar": "সোম, মঙ্গল, বৃহস্পতিবার",
        "ashubh_bar": "শুক্র, শনি",
        "shubh_rong": "হলুদ, লাল, সাদা",
        "shubh_sonkha": "২, ৩, ৯"
    }
}

# --- KAKA BABU'S RASHI-BASED FIRST LETTERS ---
# Maps 0-based Janma Rashi (Moon Sign) Index directly to its letters row
KAKA_RASHI_ALPHABET = {
    0: "অ / ল",   # মেষ (Mesha)
    1: "উ / ব",   # বৃষ (Vrishabha)
    2: "ক / ছ",   # মিথুন (Mithuna)
    3: "ড / হ",   # কর্কট (Karka)
    4: "ম / ট",   # সিংহ (Simha)
    5: "প / ঠ",   # কন্যা (Kanya)
    6: "র / ত",   # তুলা (Tula)
    7: "ন / ষ",   # বৃশ্চিক (Vrischika)
    8: "ধ / ভ",   # ধনু (Dhanu)
    9: "খ / জ",   # মকর (Makara)
    10: "গ / শ",  # কুম্ভ (Kumbha)
    11: "দ / চ"   # মীন (Meena)
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
    "gujrat":      {"lat": 23.0225, "lon": 72.5714, "timezone": "Asia/Kolkata"},
    "gujarat":     {"lat": 23.0225, "lon": 72.5714, "timezone": "Asia/Kolkata"},
    "ahmedabad":   {"lat": 23.0225, "lon": 72.5714, "timezone": "Asia/Kolkata"},
    "surat":       {"lat": 21.1702, "lon": 72.8311, "timezone": "Asia/Kolkata"},
    "vadodara":    {"lat": 22.3072, "lon": 73.1812, "timezone": "Asia/Kolkata"},
    "rajkot":      {"lat": 22.3039, "lon": 70.8022, "timezone": "Asia/Kolkata"},
    "gandhinagar": {"lat": 23.2156, "lon": 72.6369, "timezone": "Asia/Kolkata"},
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
    is_combust: bool          # True if combust with Sun
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
    ashubh_bar: list[str]
    ashubh_bar_bn: list[str]
    lucky_colors: list[str]
    lucky_colors_bn: list[str]
    lucky_numbers: list[int]
    naam_akshara: str

    # --- Planets ---
    planets: list[PlanetResult]

    # --- Dasha ---
    current_dasha_balance: tuple   # (planet, remaining_years, months, days)
    mahadasha_list: list[DashaPeriod]
    current_antardashas: list[dict[str, Any]] = field(default_factory=list)
    remedies_list: list[dict[str, Any]] = field(default_factory=list)
    debug_trace: dict[str, Any] | None = None


# ===========================================================================
# HELPERS
# ===========================================================================

def geocode_online(place: str) -> Optional[tuple[float, float, str]]:
    """Query Nominatim API directly over the wire to get lat, lon and default to Asia/Kolkata timezone."""
    import urllib.request
    import urllib.parse
    import json
    
    # 1. Search primarily in India
    try:
        headers = {"User-Agent": "AstroReportGenerator/1.0"}
        query = urllib.parse.quote(place)
        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1&countrycodes=in"
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                return lat, lon, "Asia/Kolkata"
    except Exception:
        pass
        
    # 2. Search globally as a fallback
    try:
        headers = {"User-Agent": "AstroReportGenerator/1.0"}
        query = urllib.parse.quote(place)
        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                return lat, lon, "Asia/Kolkata"
    except Exception:
        pass
        
    return None


def resolve_location(
    place: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    tz: Optional[str] = None
) -> Location:
    if lat is not None and lon is not None:
        return Location(latitude=float(lat), longitude=float(lon), timezone=tz if tz else "Asia/Kolkata")

    key = place.strip().lower()
    cfg = PLACE_CONFIG.get(key)
    if cfg is not None:
        return Location(latitude=cfg["lat"], longitude=cfg["lon"], timezone=cfg["timezone"])

    # Fallback to dynamic online geocoding lookup
    geo = geocode_online(place)
    if geo is not None:
        flat, flon, ftz = geo
        return Location(latitude=flat, longitude=flon, timezone=ftz)

    raise ValueError(f"Unsupported place: '{place}'. Please select a valid location from the search autocomplete panel.")


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
    # Use 0-based sign index (0–11) as requested
    sign_zero_based = si
    return " | ".join([
        _to_bengali_digits(str(sign_zero_based)),
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


def calculate_book_lagna(jd: float, latitude: float, longitude: float) -> float:
    """Calculate Lagna safely using absolute astronomical Julian Day.

    Accepts the pre-computed Julian Day directly instead of a datetime,
    avoiding timezone/date-shift bugs that occur when extracting .day
    from a shifted UTC datetime object.
    """
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

    val = interpolate_angle(lower_value, upper_value, lat_fraction)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    return (val - ayanamsa) % 360.0



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


def _strip_label_suffix(value: str, suffix: str) -> str:
    return value[:-len(suffix)] if value.endswith(suffix) else value


def get_koshti_attributes(rashi_index: int, nakshatra_index: int) -> dict[str, str]:
    """Looks up the exact Gan and Varna using the 36-condition cross-reference matrix."""
    default = {"gan": "দেবগণ", "varna": "শূদ্রবর্ণ"}
    return BOOK_KOSHTI_RULES.get((int(rashi_index), int(nakshatra_index)), default)


def get_gan(rashi_index: int, nakshatra_index: int) -> str:
    return get_koshti_attributes(rashi_index, nakshatra_index)["gan"]


def get_traditional_gana(nakshatra_name: str) -> str:
    """Backward-compatible wrapper for Nakshatra-name callers."""
    try:
        nakshatra_index = NAKSHATRAS.index(nakshatra_name)
        # fallback to the most common Mesha row when only a Nakshatra name is known
        return get_gan(0, nakshatra_index)
    except ValueError:
        return "দেবগণ"


def get_barna(rashi_index: int, nakshatra_index: int) -> str:
    """
    36 Conditions to determine exact Barna based on BOTH Rashi and Nakshatra.
    This fixes the Purva Bhadrapada (Kumbha vs Meena) overlap bug.
    """
    match_key = (int(rashi_index), int(nakshatra_index))
    if match_key in BOOK_KOSHTI_RULES:
        return BOOK_KOSHTI_RULES[match_key]["varna"]
    return "শূদ্রবর্ণ"


def get_varna(rashi_index: int, nakshatra_index: int) -> str:
    return get_barna(rashi_index, nakshatra_index)


def get_traditional_varna(rashi_name: str) -> str:
    """Backward-compatible wrapper for callers that still pass a Rashi name."""
    return {
        "Mesha": "ক্ষত্রিয়বর্ণ",
        "Vrishabha": "বৈশ্যবর্ণ",
        "Mithuna": "শূদ্রবর্ণ",
        "Karka": "বিপ্রবর্ণ",
        "Simha": "ক্ষত্রিয়বর্ণ",
        "Kanya": "শূদ্রবর্ণ",
        "Tula": "শূদ্রবর্ণ",
        "Vrischika": "বিপ্রবর্ণ",
        "Dhanu": "ক্ষত্রিয়বর্ণ",
        "Makara": "বৈশ্যবর্ণ",
        "Kumbha": "শূদ্রবর্ণ",
        "Meena": "বিপ্রবর্ণ",
    }.get(rashi_name, "শূদ্রবর্ণ")


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

def _calc_nakshatra(moon_longitude: float, rashi_index: int) -> NakshatraResult:
    """Calculate nakshatra from Moon's sidereal longitude using the traditional 36-condition grid."""
    NAK_SPAN = 360.0 / 27.0          # 13.3333...°
    PADA_SPAN = NAK_SPAN / 4.0       # 3.3333...°

    idx = int(moon_longitude / NAK_SPAN) % 27
    position_in_nak = moon_longitude % NAK_SPAN
    pada = int(position_in_nak / PADA_SPAN) + 1   # 1–4

    nak_name = NAKSHATRAS[idx]
    lord = NAKSHATRA_LORD_ORDER[idx % 9]
    gana = get_gan(rashi_index, idx)

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

def add_calendar_ymd(start: date, y: int, m: int, d: int) -> date:
    import calendar
    day = start.day + d
    month = start.month + m
    year = start.year + y
    
    while day > 30:
        day -= 30
        month += 1
        
    while month > 12:
        month -= 12
        year += 1
        
    while True:
        try:
            return date(year, month, day)
        except ValueError:
            max_days = calendar.monthrange(year, month)[1]
            if day > max_days:
                day -= max_days
                month += 1
                if month > 12:
                    month = 1
                    year += 1
            else:
                day = max_days


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
            dasha_end = add_calendar_ymd(current_start, bal_y, bal_m, bal_d)
            # Store balance days for antardasha scaling
            dasha_days = balance_days
        else:
            dasha_end = add_calendar_ymd(current_start, full_years, 0, 0)
            dasha_days = full_years * 365.25

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

        if is_first:
            # Scale down proportionally to balance (for the first broken dasha)
            full_ad_days = (md_full_years * ad_years / 120.0) * 365.25
            ad_days = full_ad_days * (balance_days / (md_full_years * 365.25))
            ad_end = current_start + timedelta(days=ad_days)
            y, m, d = _calendar_ymd_diff(current_start, ad_end)
        else:
            # Use exact calendar arithmetic (for all other full dashas)
            frac_years = md_full_years * ad_years / 120.0
            y = int(frac_years)
            frac_months = (frac_years - y) * 12.0
            m = int(frac_months)
            frac_days = (frac_months - m) * 30.0
            d = int(round(frac_days))
            if d >= 30:
                d -= 30
                m += 1
            if m >= 12:
                m -= 12
                y += 1
            ad_end = add_calendar_ymd(current_start, y, m, d)

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
    """Evaluates lucky attributes using Kaka Babu's static sheet."""
    # 1. Look up exact Varna from 36-condition cross-matrix
    varna_bn = get_barna(rashi_sign_idx, nakshatra.index)
    varna = _strip_label_suffix(varna_bn, "বর্ণ")

    # 2. Extract Lagna-based attributes directly from our hardcoded dictionary map
    lagna_rules = KAKA_LAGNA_RULES.get(lagna_sign_idx, KAKA_LAGNA_RULES[0])
    
    shubh_bar_bn = [lagna_rules["shubh_bar"]]
    ashubh_bar_bn = [lagna_rules["ashubh_bar"]]
    shubh_rong_bn = [lagna_rules["shubh_rong"]]
    
    # Placeholder lists for schema structural fallback compatibilities
    lucky_days = [lagna_rules["shubh_bar"]]
    ashubh_bar = [lagna_rules["ashubh_bar"]]
    lucky_colors = [lagna_rules["shubh_rong"]]
    # Pass integers for schema safety loops parsing
    lucky_numbers = [int(x) for x in lagna_rules["shubh_sonkha"].replace(" ", "").split(",") if x.isdigit()]

    return varna, varna_bn, lucky_days, shubh_bar_bn, ashubh_bar, ashubh_bar_bn, lucky_colors, shubh_rong_bn, lucky_numbers


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


COMBUSTION_THRESHOLDS = {
    "Moon": 12.0,
    "Mars": 17.0,
    "Mercury": 14.0,
    "Jupiter": 11.0,
    "Venus": 10.0,
    "Saturn": 15.0,
}


def _check_combust(pname: str, planet_lon: float, sun_lon: float) -> bool:
    if pname not in COMBUSTION_THRESHOLDS:
        return False
    threshold = COMBUSTION_THRESHOLDS[pname]
    diff = abs(planet_lon - sun_lon)
    if diff > 180.0:
        diff = 360.0 - diff
    return diff <= threshold


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
    true_node: bool = True,
    planet_overrides: Optional[dict[str, float]] = None,
    override_moon_longitude: Optional[float] = None,
    override_ascendant_longitude: Optional[float] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    timezone: Optional[str] = None,
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
    location = resolve_location(place, latitude, longitude, timezone)

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

    normalized_overrides: dict[str, float] = {}
    for planet_name, override_value in (planet_overrides or {}).items():
        normalized_overrides[str(planet_name)] = _normalize(float(override_value))
    if override_moon_longitude is not None and "Moon" not in normalized_overrides:
        normalized_overrides["Moon"] = _normalize(override_moon_longitude)

    # --- Calculate planets ---
    raw_planets: list[PlanetResult] = []
    planet_trace: list[dict[str, Any]] = []
    moon_correction_trace: dict[str, Any] | None = None
    import math

    jd_midnight_utc = math.floor(jd + 0.5) - 0.5
    fraction_of_day = jd - jd_midnight_utc

    sun_lon = None

    for pname, pid in PLANETS:
        override_lon = normalized_overrides.get(pname)
        planet_pid = pid
        if override_lon is not None:
            lon = override_lon
            pflags = flags
            speed = 0.0
            is_retro = pname in ("Rahu", "Ketu")
            if pname == "Moon":
                moon_correction_trace = {"enabled": False, "source": "planet_overrides"}
        else:
            # For Moon, prefer TRUE Moon positional flag.
            pflags = flags
            if pname == "Moon" and true_moon:
                pflags = flags | swe.FLG_TRUEPOS

            # Rahu can be switched between mean and true node without affecting Ketu's derivation.
            planet_pid = swe.TRUE_NODE if (pname == "Rahu" and true_node) else pid
            pos_today = swe.calc_ut(jd_midnight_utc, planet_pid, pflags)[0]
            pos_tomorrow = swe.calc_ut(jd_midnight_utc + 1.0, planet_pid, pflags)[0]

            lon_today = pos_today[0]
            lon_tomorrow = pos_tomorrow[0]
            lon_interpolated = interpolate_angle(lon_today, lon_tomorrow, fraction_of_day)

            lon = project_longitude(lon_interpolated)
            speed = pos_today[3]
            is_retro = True if pname in ("Rahu", "Ketu") else (speed < 0.0)
            if pname == "Moon":
                moon_correction_trace = {"enabled": False, "source": "swiss_ephemeris_true"}

        if pname == "Sun":
            sun_lon = lon

        is_combust = False
        if sun_lon is not None and pname != "Sun":
            is_combust = _check_combust(pname, lon, sun_lon)

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
            is_combust=is_combust,
            house=0,   # placeholder, filled after lagna
        ))
        if debug_trace:
            planet_trace.append(
                {
                    "planet": pname,
                    "ephemeris_id": planet_pid,
                    "flags": pflags,
                    "longitude": round(lon, 6),
                    "speed": round(speed, 9),
                    "sign_index": si,
                    "sign_name": ZODIAC_SIGNS[si],
                    "degree_in_sign": round(lon % 30.0, 4),
                    "dms": f"{deg}° {mins:02d}' {secs:02d}\"",
                    "is_retrograde": is_retro,
                    "is_combust": is_combust,
                    "override_applied": override_lon is not None,
                }
            )

    # --- Ketu = Rahu + 180° ---
    rahu = next(p for p in raw_planets if p.name == "Rahu")
    ketu_lon = _normalize(rahu.longitude + 180.0)

    # Opposition check validation
    opposition_diff = abs(((ketu_lon - rahu.longitude) % 360.0) - 180.0)
    assert opposition_diff < 0.001, f"Rahu-Ketu opposition failed: Rahu={rahu.longitude}, Ketu={ketu_lon}"

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
        is_retrograde=True,  # Ketu is always retrograde
        is_combust=False,    # Ketu is never combust
        house=0,
    ))

    # --- Lagna (Ascendant) — Lahiri ascendant tables ---
    asc_lon = calculate_book_lagna(jd, location.latitude, location.longitude)
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
            is_combust=p.is_combust,
            house=house,
        ))

    sidereal_moon_longitude = next(p.longitude for p in planets_with_houses if p.name == "Moon")
    tropical_moon_longitude = 0.0
    moon_source = "Swiss Ephemeris true moon"
    moon_flags = flags | (swe.FLG_TRUEPOS if true_moon else 0)
    if debug_trace:
        tropical_flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        if true_moon:
            tropical_flags |= swe.FLG_TRUEPOS
        tropical_moon_data = swe.calc_ut(jd, swe.MOON, tropical_flags)
        tropical_moon_longitude = _normalize(tropical_moon_data[0][0])

    # --- Moon = Rashi ---
    moon_override_value = normalized_overrides.get("Moon")
    if moon_override_value is not None:
        for idx, p in enumerate(planets_with_houses):
            if p.name == "Moon":
                si_o = _sign_index(moon_override_value)
                deg_o, min_o, sec_o = _dms(moon_override_value)
                new_combust = _check_combust("Moon", moon_override_value, sun_lon) if sun_lon is not None else False
                planets_with_houses[idx] = PlanetResult(
                    name=p.name,
                    longitude=round(moon_override_value, 6),
                    sign=ZODIAC_SIGNS[si_o],
                    sign_index=si_o,
                    degree_in_sign=round(moon_override_value % 30.0, 4),
                    minutes_in_sign=min_o,
                    seconds_in_sign=sec_o,
                    is_retrograde=p.is_retrograde,
                    is_combust=new_combust,
                    house=((si_o - lagna_si) % 12) + 1,
                )
                break
    moon = next(p for p in planets_with_houses if p.name == "Moon")
    final_moon_longitude = moon.longitude
    rashi_si = moon.sign_index

    # --- Nakshatra from Moon ---
    nakshatra = _calc_nakshatra(moon.longitude, rashi_si)

    # --- Dasha ---
    balance_info, dasha_list = _calc_dasha(moon.longitude, dob)

    # --- Lucky fields ---
    varna, varna_bn, lucky_days, lucky_days_bn, ashubh_bar, ashubh_bar_bn, lucky_colors, lucky_colors_bn, lucky_numbers = \
        _calc_lucky_fields(lagna_si, rashi_si, nakshatra)

    # --- Dynamic Antardasha Slicing (9 periods from current date) ---
    today = datetime.now(ZoneInfo(location.timezone)).date()
    all_ads = []
    planet_names_bn = {
        "Sun": "রবি", "Moon": "চন্দ্র", "Mars": "মঙ্গল", 
        "Mercury": "বুধ", "Jupiter": "বৃহস্পতি", "Venus": "শুক্র", 
        "Saturn": "শনি", "Rahu": "রাহু", "Ketu": "কেতু"
    }

    for md in dasha_list:
        for ad in md.antardashas:
            md_bn = planet_names_bn.get(md.planet, md.planet)
            ad_bn = planet_names_bn.get(ad.planet, ad.planet)
            dur_str_bn = f"{_to_bengali_digits(str(ad.duration_years))} - {_to_bengali_digits(str(ad.duration_months))} - {_to_bengali_digits(str(ad.duration_days))}"
            start_date_bn = _to_bengali_digits(ad.start_date.strftime("%Y - %m - %d"))
            end_date_bn = _to_bengali_digits(ad.end_date.strftime("%Y - %m - %d"))
            
            all_ads.append({
                "mahadasha": md.planet,
                "mahadasha_bn": md_bn,
                "antardasha": ad.planet,
                "antardasha_bn": ad_bn,
                "start_date": ad.start_date,
                "end_date": ad.end_date,
                "start_date_bn": start_date_bn,
                "end_date_bn": end_date_bn,
                "duration_bn": dur_str_bn
            })
    
    current_ads = []
    for i, ad_dict in enumerate(all_ads):
        if ad_dict["start_date"] <= today < ad_dict["end_date"]:
            current_ads = all_ads[i:i+9]
            break
    
    if not current_ads:
        current_ads = all_ads[:9]

    # Populate default remedies to ensure they are available in the visual editor
    remedies = [
        {"id": "১", "gemstone": "সহ্যহলে নীলা - ৫/৬ রতি / নাহলে এমিথিস্ট - ২৪/২৫ রতি", "remedy_root": "শ্বেতবেড়ালা + সীসা", "gemstone_rating": 0, "root_rating": 0},
        {"id": "২", "gemstone": "হীরে - ৪৫/৫০ সেন্ট অথবা সাদাপলা - ১৮/২০ রতি অথবা সাদা জারকন - ৫/৬ রতি", "remedy_root": "রামবাসক + প্ল্যাটিনাম", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৩", "gemstone": "পান্না - ৫/৬ রতি", "remedy_root": "বৃদ্ধদারক + সোনা", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৪", "gemstone": "পোখরাজ - ৫/৬ রতি", "remedy_root": "বামনহাটি + সোনা", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৫", "gemstone": "লালপলা - ১০/১১ রতি", "remedy_root": "অনন্তমূল + তামা", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৬", "gemstone": "মুক্ত - ৭/৮ রতি", "remedy_root": "ক্ষীরিকা + রূপো", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৭", "gemstone": "চুনী - ৫/৬ রতি", "remedy_root": "বিল্বমূল + তামা", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৮", "gemstone": "ক্যাটসআই - ৩/৪ রতি", "remedy_root": "অশ্বগন্ধা + রাং", "gemstone_rating": 0, "root_rating": 0},
        {"id": "৯", "gemstone": "গোমেদ - ৭/৮ রতি", "remedy_root": "শ্বেতচন্দন + লোহা", "gemstone_rating": 0, "root_rating": 0}
    ]

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
        ashubh_bar=ashubh_bar,
        ashubh_bar_bn=ashubh_bar_bn,
        lucky_colors=lucky_colors,
        lucky_colors_bn=lucky_colors_bn,
        lucky_numbers=lucky_numbers,
        naam_akshara=nakshatra.naam_akshara,
        planets=planets_with_houses,
        current_dasha_balance=balance_info,
        mahadasha_list=dasha_list,
        current_antardashas=current_ads,
        remedies_list=remedies,
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
                override_moon_longitude=moon_override_value,
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
    print("  বর্তমান অন্তর্দশা / CURRENT 9 ANTARDASHAS")
    print("─" * 65)
    if result.current_antardashas:
        print(f"  {'MD Planet':<10} {'AD Planet':<10} {'Start Date':<14} {'End Date':<14} {'Duration (bn)'}")
        print(f"  {'---------':<10} {'---------':<10} {'----------':<14} {'--------':<14} {'-------------'}")
        for ad in result.current_antardashas:
            print(f"  {ad['mahadasha']:<10} {ad['antardasha']:<10} {str(ad['start_date']):<14} {str(ad['end_date']):<14} {ad['duration_bn']}")
    print("=" * 65)
