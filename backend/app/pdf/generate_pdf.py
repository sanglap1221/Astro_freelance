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
    resolve_location,
)
from app.astrology.bengali_date import (
    gregorian_to_bengali,
    format_bengali_date_bn,
)
from app.schemas import PdfRequest

from app.astrology.bengali_date import (
    gregorian_to_bengali,
    BENGALI_MONTHS_EN,
    BENGALI_MONTHS_BN,
)

PLANET_DISPLAY_ORDER = ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Rahu", "Ketu"]

TRANSLATIONS = {
    "bn": {
        "title": "জীবন জিজ্ঞাসা",
        "name": "নাম",
        "father_name": "পিতার নাম",
        "dob": "জন্ম তারিখ",
        "bengali_dob": "বাংলা তারিখ",
        "time": "জন্ম সময়",
        "place": "জন্মস্থান",
        "weekday": "জন্ম বার",
        "english_bar": "ইংরেজি বার",
        "bengali_bar": "বাংলা বার",
        "mobile": "মোবাইল",
        "report_no": "রিপোর্ট নং",
        "generated_at": "তারিখ",
        
        "rashi": "রাশি",
        "lagna": "লগ্ন",
        "nakshatra": "নক্ষত্র",
        "pada": "পাদ",
        "gan": "গণ",
        "varna": "বর্ণ",
        "lucky_days": "শুভ বার",
        "ashubh_bar": "অশুভ বার",
        "lucky_colors": "শুভ রং",
        "lucky_numbers": "শুভ সংখ্যা",
        "naam_akshara": "নামের আদ্যক্ষর",
        "other_letters": "অন্যান্য অক্ষর",
        "dasha_balance": "দশা ভোগ",
        "remedies": "প্রতিকার",
        "remedies_sub": "গ্রহরত্ন, শিকড় ও ধাতু",
        "remedies_no": "নং",
        "remedies_gem": "গ্রহরত্ন (Gemstones)",
        "remedies_root": "শিকড় + ধাতু (Roots & Metals)",
        "planetary_positions": "গ্রহাবস্থান",
        "rashi_chakra": "রাশি চক্র",
        "vimshottari_dasha": "বিংশোত্তরী দশা :",
        "vimshottari_antardasha": "বিংশোত্তরী অন্তর্দশা :",
        "future_antardashas": "-ঃ ভবিষ্যৎ অন্তর্দশা সমূহ ঃ-",
        "remedies_title": "-ঃ প্রতিকার ঃ-",
        "remedies_subtitle": "-ঃ গ্রহরত্ন, শিকড় ও ধাতু ঃ-",
        "year": "বছর",
        "month": "মাস",
        "day": "দিন",
        "years": "বছর",
        "months": "মাস",
        "days": "দিন",
        "and": "ও",
        "combust": "অ",
        "retrograde": "ব",
        "lagna_label": "লগ্নস্ফুট",
        "lang_lagna_display": "লং",
        "mahadasha_title": "মহাদশা",
        "dosha_dasha": "দোষ",
        "remedy_note": "** ধাতু ও শ্বেতচন্দন পাল্টানোর প্রয়োজন নেই **",
        
        "planets": {
            "Sun": "রবি", "Moon": "চন্দ্র", "Mars": "মঙ্গল", "Mercury": "বুধ",
            "Jupiter": "বৃহস্পতি", "Venus": "শুক্র", "Saturn": "শনি", "Rahu": "রাহু", "Ketu": "কেতু"
        },
        "planet_abbr": {
            "Sun": "র", "Moon": "চ", "Mars": "ম", "Mercury": "বু",
            "Jupiter": "বৃ", "Venus": "শু", "Saturn": "শ", "Rahu": "রা", "Ketu": "কে", "Lagna": "লং"
        },
        "weekdays": {
            "Sun": "রবি", "Mon": "সোম", "Tue": "মঙ্গল", "Wed": "বুধ",
            "Thu": "বৃহস্পতি", "Fri": "শুক্র", "Sat": "শনি"
        },
        "weekdays_full": {
            "Sun": "রবিবার", "Mon": "সোমবার", "Tue": "মঙ্গলবার", "Wed": "বুধবার",
            "Thu": "বৃহস্পতিবার", "Fri": "শুক্রবার", "Sat": "শনিবার"
        },
        "zodiac_signs": ["মেষ", "বৃষ", "মিথুন", "কর্কট", "সিংহ", "কন্যা", "তুলা", "বৃশ্চিক", "ধনু", "মকর", "কুম্ভ", "মীন"],
        "nakshatras": [
        "অশ্বিনী", "ভরণী", "কৃত্তিকা", "রোহিণী", "মৃগশিরা", "আর্দ্রা",
            "পুনর্ব্বসু", "পুষ্যা", "অশ্লেষা", "মঘা", "পূর্ব্বফল্গুনী",
            "উত্তরফল্গুনী", "হস্তা", "চিত্রা", "স্বাতী", "বিশাখা",
            "অনুরাধা", "জ্যেষ্ঠা", "মূলা", "পূর্ব্বাষাঢ়া", "উত্তরাষাঢ়া",
            "শ্রবণা", "ধনিষ্ঠা", "শতভিষা", "পূর্ব্বভাদ্রপদ",
            "উত্তরভাদ্রপদ", "রেবতী"
        ],
        "varnas": {
            "Brahmin": "ব্রাহ্মণ", "Vipra": "বিপ্র", "Kshatriya": "ক্ষত্রিয়",
            "Vaishya": "বৈশ্য", "Shudra": "শূদ্র"
        },
        "ganas": {
            "Devagana": "দেবগণ", "Manushyagana": "নরগণ", "Rakshasagana": "রাক্ষসগণ"
        }
    },
    "hi": {
        "title": "जीवन जिज्ञासा",
        "name": "नाम",
        "father_name": "पिता का नाम",
        "dob": "जन्म तिथि",
        "bengali_dob": "बंगाली तिथि",
        "time": "जन्म समय",
        "place": "जन्म स्थान",
        "weekday": "जन्म दिन",
        "english_bar": "अंग्रेजी वार",
        "bengali_bar": "बंगाली वार",
        "mobile": "मोबाइल",
        "report_no": "रिपोर्ट संख्या",
        "generated_at": "दिनांक",
        
        "rashi": "राशि",
        "lagna": "लग्न",
        "nakshatra": "नक्षत्र",
        "pada": "चरण",
        "gan": "गण",
        "varna": "वर्ण",
        "lucky_days": "शुभ दिन",
        "ashubh_bar": "अशुभ दिन",
        "lucky_colors": "शुभ रंग",
        "lucky_numbers": "शुभ अंक",
        "naam_akshara": "शुभ नाम अक्षर",
        "other_letters": "अन्य अक्षर",
        "dasha_balance": "दशा भोग",
        "remedies": "उपाय",
        "remedies_sub": "रत्न, जड़ और धातु",
        "remedies_no": "क्र.",
        "remedies_gem": "रत्न (Gemstones)",
        "remedies_root": "जड़ + धातु (Roots & Metals)",
        "planetary_positions": "ग्रह स्थिति",
        "rashi_chakra": "राशि चक्र",
        "vimshottari_dasha": "विंशोत्तरी दशा :",
        "vimshottari_antardasha": "विंशोत्तरी अंतर्दशा :",
        "future_antardashas": "-ः भविष्य अंतर्दशा विवरण ঃ-",
        "remedies_title": "-ः उपाय ঃ-",
        "remedies_subtitle": "-ः रत्न, जड़ और धातु ঃ-",
        "year": "वर्ष",
        "month": "माह",
        "day": "दिन",
        "years": "वर्ष",
        "months": "माह",
        "days": "दिन",
        "and": "और",
        "combust": "अ",
        "retrograde": "व",
        "lagna_label": "लग्न",
        "lang_lagna_display": "लंग",
        "mahadasha_title": "महादशा",
        "dosha_dasha": "दोष / दशा",
        "remedy_note": "** धातु और सफेद चंदन बदलने की आवश्यकता नहीं है **",
        
        "planets": {
            "Sun": "सूर्य", "Moon": "चंद्र", "Mars": "मंगल", "Mercury": "बुध",
            "Jupiter": "गुरु", "Venus": "शुक्र", "Saturn": "शनि", "Rahu": "राहु", "Ketu": "केतु"
        },
        "planet_abbr": {
            "Sun": "सू", "Moon": "चं", "Mars": "मं", "Mercury": "बु",
            "Jupiter": "गु", "Venus": "शु", "Saturn": "श", "Rahu": "रा", "Ketu": "के", "Lagna": "लंग"
        },
        "weekdays": {
            "Sun": "रविवार", "Mon": "सोमवार", "Tue": "मंगलवार", "Wed": "बुधवार",
            "Thu": "गुरुवार", "Fri": "शुक्रवार", "Sat": "शनिवार"
        },
        "weekdays_full": {
            "Sun": "रविवार", "Mon": "सोमवार", "Tue": "मंगलवार", "Wed": "बुधवार",
            "Thu": "गुरुवार", "Fri": "शुक्रवार", "Sat": "शनिवार"
        },
        "zodiac_signs": ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"],
        "nakshatras": [
            "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
            "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी",
            "उत्तराफाल्गुनी", "हस्त", "चित्रा", "स्वाती", "विशाखा",
            "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा",
            "श्रवण", "धनिष्ठा", "शतभीषा", "पूर्वाभाद्रपद",
            "उत्तराभाद्रपद", "रेवती"
        ],
        "varnas": {
            "Brahmin": "ब्राह्मण", "Vipra": "विप्र", "Kshatriya": "क्षत्रिय",
            "Vaishya": "वैश्य", "Shudra": "शूद्र"
        },
        "ganas": {
            "Devagana": "देवगण", "Manushyagana": "मनुष्यगण", "Rakshasagana": "राक्षसगण"
        }
    },
    "en": {
        "title": "Jibon Jiggasa",
        "name": "Name",
        "father_name": "Father's Name",
        "dob": "Date of Birth",
        "bengali_dob": "Bengali Date",
        "time": "Time of Birth",
        "place": "Birth Place",
        "weekday": "Day of Birth",
        "english_bar": "English Day",
        "bengali_bar": "Bengali Day",
        "mobile": "Mobile",
        "report_no": "Report No",
        "generated_at": "Date",
        
        "rashi": "Rashi",
        "lagna": "Lagna",
        "nakshatra": "Nakshatra",
        "pada": "Pada",
        "gan": "Gana",
        "varna": "Varna",
        "lucky_days": "Lucky Days",
        "ashubh_bar": "Unlucky Days",
        "lucky_colors": "Lucky Colors",
        "lucky_numbers": "Lucky Numbers",
        "naam_akshara": "Syllable",
        "other_letters": "Other Syllables",
        "dasha_balance": "Dasha Balance",
        "remedies": "Remedies",
        "remedies_sub": "Gemstones, Roots & Metals",
        "remedies_no": "No.",
        "remedies_gem": "Gemstones",
        "remedies_root": "Roots & Metals",
        "planetary_positions": "Planetary Positions",
        "rashi_chakra": "Rashi Chakra",
        "vimshottari_dasha": "Vimshottari Dasha :",
        "vimshottari_antardasha": "Vimshottari Antardasha :",
        "future_antardashas": "-: Future Antardashas :-",
        "remedies_title": "-: Remedies :-",
        "remedies_subtitle": "-: Gemstones, Roots & Metals :-",
        "year": "Y",
        "month": "M",
        "day": "D",
        "years": "years",
        "months": "months",
        "days": "days",
        "and": "and",
        "combust": "C",
        "retrograde": "R",
        "lagna_label": "Lagna",
        "lang_lagna_display": "Lagn",
        "mahadasha_title": "Mahadasha",
        "dosha_dasha": "Dosha / Dasha",
        "remedy_note": "** Metals and White Sandalwood do not need to be changed **",
        
        "planets": {
            "Sun": "Sun", "Moon": "Moon", "Mars": "Mars", "Mercury": "Mercury",
            "Jupiter": "Jupiter", "Venus": "Venus", "Saturn": "Saturn", "Rahu": "Rahu", "Ketu": "Ketu"
        },
        "planet_abbr": {
            "Sun": "Su", "Moon": "Mo", "Mars": "Ma", "Mercury": "Me",
            "Jupiter": "Ju", "Venus": "Ve", "Saturn": "Sa", "Rahu": "Ra", "Ketu": "Ke", "Lagna": "Lagn"
        },
        "weekdays": {
            "Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
            "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"
        },
        "weekdays_full": {
            "Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
            "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"
        },
        "zodiac_signs": ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
        "nakshatras": [
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
            "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
            "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
            "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
            "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
            "Uttara Bhadrapada", "Revati"
        ],
        "varnas": {
            "Brahmin": "Brahmin", "Vipra": "Vipra", "Kshatriya": "Kshatriya",
            "Vaishya": "Vaishya", "Shudra": "Shudra"
        },
        "ganas": {
            "Devagana": "Devagana", "Manushyagana": "Manushyagana", "Rakshasagana": "Rakshasagana"
        }
    }
}

BENGALI_TO_DEVANAGARI = {
    'অ': 'अ', 'আ': 'आ', 'ই': 'इ', 'ঈ': 'ई', 'উ': 'उ', 'ঊ': 'ऊ', 'ঋ': 'ऋ', 'এ': 'ए', 'ঐ': 'ऐ', 'ও': 'ओ', 'ঔ': 'औ',
    'া': 'ा', 'ি': 'ि', 'ী': 'ी', 'ু': 'ु', 'ূ': 'ू', 'r': 'ृ', 'ৃ': 'ृ', 'ে': 'े', 'ৈ': 'ै', 'ো': 'ो', 'ৌ': 'ौ',
    'ক': 'क', 'খ': 'ख', 'গ': 'ग', 'ঘ': 'घ', 'ঙ': 'ङ',
    'চ': 'च', 'ছ': 'छ', 'জ': 'ज', 'ঝ': 'झ', 'ঞ': 'ञ',
    'ট': 'ट', 'ঠ': 'ठ', 'ড': 'ड', 'ঢ': 'ढ', 'ণ': 'ण',
    'ত': 'त', 'থ': 'थ', 'দ': 'द', 'ধ': 'ध', 'ন': 'न',
    'প': 'प', 'ফ': 'फ', 'ব': 'ब', 'ভ': 'भ', 'ম': 'म',
    'য': 'य', 'র': 'र', 'ল': 'ल', 'শ': 'श', 'ষ': 'ष', 'স': 'स', 'হ': 'ह',
    'ড়': 'ड़', 'ঢ়': 'ढ़', 'য়': 'य', 'ৎ': 'त्', 'ং': 'ं', 'ঃ': 'ः', 'ঁ': 'ँ',
    '্': '्', 'ূ': 'ू'
}

BENGALI_TO_ENGLISH_SYLLABLES = {
    "চু": "Chu", "চে": "Che", "চো": "Cho", "লা": "La",
    "লী": "Li", "লূ": "Lu", "লে": "Le", "লো": "Lo",
    "আ": "A", "ই": "I", "উ": "U", "এ": "E",
    "ও": "O", "বা": "Ba", "বি": "Bi", "বু": "Bu",
    "বে": "Be", "বো": "Bo", "কা": "Ka", "কি": "Ki",
    "কু": "Ku", "ঘ": "Gha", "ঙ": "Nga", "ছ": "Chha",
    "কে": "Ke", "কো": "Ko", "হা": "Ha", "হি": "Hi",
    "হু": "Hu", "হে": "He", "হো": "Ho", "ডা": "Da",
    "ডি": "Di", "ডু": "Du", "ডে": "De", "ডো": "Do",
    "মা": "Ma", "মি": "Mi", "মু": "Mu", "মে": "Me",
    "মো": "Mo", "টা": "Ta", "টি": "Ti", "টু": "Tu",
    "টে": "Te", "টো": "To", "পা": "Pa", "pi": "Pi", "পি": "Pi",
    "পু": "Pu", "ষ": "Sha", "ণ": "Na", "ঠ": "Tha",
    "পে": "Pe", "পো": "Po", "রা": "Ra", "রি": "Ri",
    "রু": "Ru", "রে": "Re", "রো": "Ro", "তা": "Ta",
    "তি": "Ti", "তু": "Tu", "তে": "Te", "तो": "To", "তো": "To",
    "না": "Na", "নি": "Ni", "নু": "Nu", "নে": "Ne",
    "নো": "No", "যা": "Ya", "যি": "Yi", "যু": "Yu",
    "যে": "Ye", "যো": "Yo", "ভা": "Bha", "ভি": "Bhi",
    "ভু": "Bhu", "ধা": "Dha", "ফা": "Pha", "ঢা": "Dha",
    "ভে": "Bhe", "ভো": "Bho", "জা": "Ja", "জি": "Ji",
    "খি": "Khi", "খু": "Khu", "খে": "Khe", "खो": "Kho",
    "গা": "Ga", "গি": "Gi", "গু": "Gu", "গে": "Ge",
    "গো": "Go", "সা": "Sa", "সি": "Si", "সু": "Su",
    "সে": "Se", "সো": "So", "দা": "Da", "ডি": "Di",
    "দু": "Du", "থ": "Tha", "ঝ": "Jha", "ঞ": "Nya",
    "দে": "De", "দো": "Do", "চা": "Cha", "চি": "Chi"
}

BN_WEEKDAY_TO_KEY = {
    "রবি": "Sun", "সোম": "Mon", "মঙ্গল": "Tue", "বুধ": "Wed",
    "বৃহস্পতি": "Thu", "শুক্র": "Fri", "শনি": "Sat"
}

BN_COLOR_TO_KEY = {
    "সাদা": "White", "লাল": "Red", "হলুদ": "Yellow", "তামাটে": "Copper",
    "সবুজ": "Green", "নীলাভ সাদা": "Bluish White", "নীল": "Blue"
}

COLOR_TRANSLATIONS = {
    "bn": {
        "White": "সাদা", "Red": "লাল", "Yellow": "হলুদ", "Copper": "তামাটে",
        "Green": "সবুজ", "Bluish White": "নীলাভ সাদা", "Blue": "নীল"
    },
    "hi": {
        "White": "सफेद", "Red": "लाल", "Yellow": "पीला", "Copper": "तांबा",
        "Green": "हरा", "Bluish White": "नीला-सफेद", "Blue": "नीला"
    },
    "en": {
        "White": "White", "Red": "Red", "Yellow": "Yellow", "Copper": "Copper",
        "Green": "Green", "Bluish White": "Bluish White", "Blue": "Blue"
    }
}

VARNA_MAP = {
    "ব্রাহ্মণ": "Brahmin", "ক্ষত্রিয়": "Kshatriya", "বৈশ্য": "Vaishya",
    "শূদ্র": "Shudra", "বিপ্র": "Vipra", "ব্রাহ্মণবর্ণ": "Brahmin",
    "ক্ষত্রিয়বর্ণ": "Kshatriya", "বৈশ্যবর্ণ": "Vaishya", "শূদ্রবর্ণ": "Shudra",
    "বিপ্রবর্ণ": "Vipra"
}

GANA_MAP = {
    "দেবগণ": "Devagana", "নরগণ": "Manushyagana", "রাক্ষসগণ": "Rakshasagana"
}

KAKA_RASHI_ALPHABET = {
    0: "অ / ল", 1: "উ / ব", 2: "ক / ছ", 3: "ড / হ", 4: "ম / ট", 5: "প / ঠ",
    6: "র / ত", 7: "ন / ষ", 8: "ধ / ভ", 9: "খ / জ", 10: "গ / শ", 11: "দ / চ"
}

KAKA_RASHI_ALPHABET_HI = {
    0: "अ / ल", 1: "उ / व", 2: "क / छ", 3: "ड / ह", 4: "म / ट", 5: "प / ठ",
    6: "र / त", 7: "न / ष", 8: "ध / भ", 9: "ख / ज", 10: "ग / श", 11: "द / च"
}

KAKA_RASHI_ALPHABET_EN = {
    0: "A / L", 1: "U / V", 2: "K / Ch", 3: "D / H", 4: "M / T", 5: "P / Th",
    6: "R / T", 7: "N / Sh", 8: "Dh / Bh", 9: "Kh / J", 10: "G / Sh", 11: "D / Ch"
}

ALPHABET_MAPS = {
    "bn": KAKA_RASHI_ALPHABET,
    "hi": KAKA_RASHI_ALPHABET_HI,
    "en": KAKA_RASHI_ALPHABET_EN
}

REMEDIES_TRANSLATIONS = {
    "bn": [
        {"id": "১", "gemstone": "সহ্যহলে নীলা - ৫/৬ রতি / নাহলে এমিথিস্ট - ২৪/২৫ রতি", "remedy_root": "শ্বেতবেড়ালা + সীসা"},
        {"id": "২", "gemstone": "হীরে - ৪৫/৫০ সেন্ট অথবা সাদাপলা - ১৮/২০ রতি অথবা সাদা জারকন - ৫/৬ রতি", "remedy_root": "রামবাসক + প্ল্যাটিনাম"},
        {"id": "৩", "gemstone": "পান্না - ৫/৬ রতি", "remedy_root": "বৃদ্ধদারক + সোনা"},
        {"id": "৪", "gemstone": "পোখরাজ - ৫/৬ রতি", "remedy_root": "বামনহাটি + সোনা"},
        {"id": "৫", "gemstone": "লালপলা - ১০/১১ রতি", "remedy_root": "অনন্তমূল + তামা"},
        {"id": "৬", "gemstone": "মুক্ত - ৭/৮ রতি", "remedy_root": "ক্ষীরিকা + রূপো"},
        {"id": "৭", "gemstone": "চুনী - ৫/৬ রতি", "remedy_root": "বিল্বমূল + তামা"},
        {"id": "৮", "gemstone": "ক্যাটসআই - ৩/৪ রতি", "remedy_root": "অশ্বগন্ধা + রাং"},
        {"id": "৯", "gemstone": "গোমেদ - ৭/৮ রতি", "remedy_root": "শ্বেতচন্দন + লোহা"}
    ],
    "hi": [
        {"id": "१", "gemstone": "नीलम (अनुकूल होने पर) - ५/६ रत्ती / अन्यथा एमेथिस्ट - २४/२५ रत्ती", "remedy_root": "श्वेत बेराला + सीसा"},
        {"id": "२", "gemstone": "हीरा - ४५/५० सेंट या सफेद मूंगा - १८/२० रत्ती या सफेद जरकन - ५/६ रत्ती", "remedy_root": "रामबांस + प्लैटिनम"},
        {"id": "३", "gemstone": "पन्ना - ५/६ रत्ती", "remedy_root": "वृद्धदारक + सोना"},
        {"id": "४", "gemstone": "पुखराज - ५/६ रत्ती", "remedy_root": "बामनहाटी + सोना"},
        {"id": "५", "gemstone": "लाल मूंगा - १०/११ रत्ती", "remedy_root": "अनंतमूल + तांबा"},
        {"id": "६", "gemstone": "मोती - ७/८ रत्ती", "remedy_root": "क्षीरिका + चांदी"},
        {"id": "७", "gemstone": "माणिक्य (रूबी) - ५/६ रत्ती", "remedy_root": "बिल्वमूल + तांबा"},
        {"id": "८", "gemstone": "लहसुनिया (कैट्स आई) - ३/४ रत्ती", "remedy_root": "अश्वगंधा + रांगा"},
        {"id": "९", "gemstone": "गोमेद - ७/८ रत्ती", "remedy_root": "श्वेत चंदन + लोहा"}
    ],
    "en": [
        {"id": "1", "gemstone": "Blue Sapphire (if suitable) - 5/6 Ratti / otherwise Amethyst - 24/25 Ratti", "remedy_root": "White Berela + Lead"},
        {"id": "2", "gemstone": "Diamond - 45/50 Cent or White Coral - 18/20 Ratti or White Zircon - 5/6 Zircon - 5/6 Ratti", "remedy_root": "Rambasak + Platinum"},
        {"id": "3", "gemstone": "Emerald - 5/6 Ratti", "remedy_root": "Vriddhadarak + Gold"},
        {"id": "4", "gemstone": "Yellow Sapphire - 5/6 Ratti", "remedy_root": "Bamanhati + Gold"},
        {"id": "5", "gemstone": "Red Coral - 10/11 Ratti", "remedy_root": "Anantamul + Copper"},
        {"id": "6", "gemstone": "Pearl - 7/8 Ratti", "remedy_root": "Kshirika + Silver"},
        {"id": "7", "gemstone": "Ruby - 5/6 Ratti", "remedy_root": "Bilvamul + Copper"},
        {"id": "8", "gemstone": "Cat's Eye - 3/4 Ratti", "remedy_root": "Ashwagandha + Pewter"},
        {"id": "9", "gemstone": "Hessonite (Gomed) - 7/8 Ratti", "remedy_root": "White Sandalwood + Iron"}
    ]
}


def to_local_digits(value: Any, lang: str = "bn") -> str:
    val_str = str(value)
    if lang == "bn":
        digits = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
    elif lang == "hi":
        digits = str.maketrans("0123456789", "०१२३४५६७८९")
    else:
        return val_str
    return val_str.translate(digits)


def translate_comma_separated_weekdays(val_str: str, lang: str) -> str:
    if not val_str or lang == "bn":
        return val_str
    parts = [p.strip() for p in val_str.replace("，", ",").split(",")]
    translated_parts = []
    for p in parts:
        key = BN_WEEKDAY_TO_KEY.get(p)
        if key:
            translated_parts.append(TRANSLATIONS[lang]["weekdays"].get(key, p))
        else:
            translated_parts.append(p)
    return ", ".join(translated_parts)


def translate_comma_separated_colors(val_str: str, lang: str) -> str:
    if not val_str or lang == "bn":
        return val_str
    parts = [p.strip() for p in val_str.replace("，", ",").split(",")]
    translated_parts = []
    for p in parts:
        key = BN_COLOR_TO_KEY.get(p)
        if key:
            translated_parts.append(COLOR_TRANSLATIONS[lang].get(key, p))
        else:
            translated_parts.append(p)
    return ", ".join(translated_parts)


def translate_varna(varna_bn: str, lang: str) -> str:
    if lang == "bn":
        return varna_bn
    # Remove suffix if any
    cleaned = varna_bn.replace("বর্ণ", "").strip()
    key = VARNA_MAP.get(cleaned)
    if not key:
        key = VARNA_MAP.get(varna_bn)
    
    if key:
        return TRANSLATIONS[lang]["varnas"].get(key, varna_bn)
    return varna_bn


def translate_gana(gana_bn: str, lang: str) -> str:
    if lang == "bn":
        return gana_bn
    key = GANA_MAP.get(gana_bn)
    if key:
        return TRANSLATIONS[lang]["ganas"].get(key, gana_bn)
    return gana_bn


def format_bengali_date(year: int, month_idx: int, day: int, lang: str = "bn") -> str:
    if lang == "bn":
        day_str = to_local_digits(str(day), "bn")
        year_str = to_local_digits(str(year), "bn")
        month_name = BENGALI_MONTHS_BN[month_idx]
        return f"{day_str} {month_name} {year_str}"
    elif lang == "hi":
        day_str = to_local_digits(str(day), "hi")
        year_str = to_local_digits(str(year), "hi")
        MONTHS_HI = ["बैसाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "अश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन", "चैत्र"]
        month_name = MONTHS_HI[month_idx]
        return f"{day_str} {month_name} {year_str}"
    else:
        month_name = BENGALI_MONTHS_EN[month_idx]
        return f"{day} {month_name} {year}"


def translate_syllable(syl: str, lang: str) -> str:
    if not syl or lang == "bn":
        return syl
    if lang == "hi":
        return "".join(BENGALI_TO_DEVANAGARI.get(c, c) for c in syl)
    return BENGALI_TO_ENGLISH_SYLLABLES.get(syl, syl)


class PdfReportResult:
    def __init__(self, pdf_url: str):
        self.pdf_url = pdf_url


def build_report_context(payload: PdfRequest) -> dict[str, Any]:
    lang = getattr(payload, "language", "bn") or "bn"
    if lang not in TRANSLATIONS:
        lang = "bn"
        
    labels = TRANSLATIONS[lang]
    
    if lang == "bn":
        digit_map = {'0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯'}
    elif lang == "hi":
        digit_map = {'0':'०', '1':'१', '2':'२', '3':'३', '4':'४', '5':'५', '6':'६', '7':'७', '8':'८', '9':'९'}
    else:
        digit_map = {'0':'0', '1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9'}

    # Extract parameters and resolve location coordinates and timezone
    if isinstance(payload, dict):
        place = payload.get("place", "")
        lat = payload.get("latitude")
        lon = payload.get("longitude")
        tz = payload.get("timezone")
        dob = payload.get("dob")
        birth_time = payload.get("time")
        planet_overrides = payload.get("planet_overrides")
        override_moon_longitude = payload.get("override_moon_longitude")
    else:
        place = payload.place
        lat = getattr(payload, "latitude", None)
        lon = getattr(payload, "longitude", None)
        tz = getattr(payload, "timezone", None)
        dob = payload.dob
        birth_time = getattr(payload, "time", None)
        planet_overrides = getattr(payload, "planet_overrides", None)
        override_moon_longitude = getattr(payload, "override_moon_longitude", None)

    loc = resolve_location(place, lat, lon, tz)

    # 1. Run astrological calculations
    chart = calculate_chart(
        dob=dob,
        birth_time=birth_time,
        place=place,
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone=loc.timezone,
        ayanamsa_mode="traditional",
        true_moon=True,
        true_node=True,
        planet_overrides=planet_overrides,
        override_moon_longitude=override_moon_longitude,
    )

    # 2. Generate report_no
    report_no = to_local_digits(str(random.randint(10000, 99999)), lang)

    # 3. Formulate generated_at
    current_date = date.today()
    generated_at = to_local_digits(current_date.strftime("%d-%m-%Y"), lang)

    # 4. Formulate customer
    by, bm, bd, effective_date = gregorian_to_bengali(
        dob,
        birth_time=birth_time,
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone_name=loc.timezone
    )
    calculated_bengali_dob = format_bengali_date(by, bm, bd, lang)

    bengali_dob = None
    if isinstance(payload, dict):
        bengali_dob = payload.get("bengali_dob")
    else:
        bengali_dob = getattr(payload, "bengali_dob", None)

    if not bengali_dob:
        bengali_dob = calculated_bengali_dob

    weekday_en_orig = payload.dob.strftime("%a")
    english_weekday = labels["weekdays_full"].get(weekday_en_orig, "-")

    weekday_en_eff = effective_date.strftime("%a")
    bengali_weekday = labels["weekdays_full"].get(weekday_en_eff, "-")

    customer = {
        "name": payload.name,
        "father_name": payload.father_name if payload.father_name else "",
        "dob": to_local_digits(payload.dob.strftime("%d-%m-%Y"), lang),
        "bengali_dob": bengali_dob,
        "time": to_local_digits(payload.time.strftime("%H:%M"), lang),
        "place": payload.place,
        "weekday": bengali_weekday,
        "english_weekday": english_weekday,
        "bengali_weekday": bengali_weekday,
        "mobile": to_local_digits(payload.mobile, lang) if payload.mobile else "",
    }

    # 5. Formulate engine metadata
    engine = {
        "engine": "Swiss Ephemeris",
        "system": "Nirayana (Sidereal)",
        "ayanamsa": "Traditional Bengali N.C. Lahiri Workflow",
        "moon_mode": "True Moon",
        "true_node": True,
        "planet_overrides": payload.planet_overrides,
        "override_moon": to_local_digits(f"{payload.override_moon_longitude:.4f}°", lang)
        if payload.override_moon_longitude is not None
        else None,
    }

    # 6. Formulate summary
    bal = chart.current_dasha_balance
    bal_planet = labels["planets"].get(bal[0], bal[0])
    bal_y = to_local_digits(str(bal[1]), lang)
    bal_m = to_local_digits(str(bal[2]), lang)
    bal_d = to_local_digits(str(bal[3]), lang)
    
    lbl_y = labels["year"]
    lbl_m = labels["month"]
    lbl_d = labels["day"]
    dasha_balance_str = f"{bal_planet} — {bal_y} {lbl_y} {bal_m} {lbl_m} {bal_d} {lbl_d}"

    summary = {
        "rashi": labels["zodiac_signs"][chart.rashi_sign_index],
        "lagna": labels["zodiac_signs"][chart.lagna_sign_index],
        "lagna_sign_index": chart.lagna_sign_index,
        "nakshatra": labels["nakshatras"][chart.nakshatra.index],
        "nakshatra_pada": to_local_digits(str(chart.nakshatra.pada), lang),
        "nakshatra_lord": labels["planets"].get(chart.nakshatra.lord, chart.nakshatra.lord),
        "pada": to_local_digits(str(chart.nakshatra.pada), lang),
        "ayanamsa": to_local_digits(f"{chart.ayanamsa:.4f}", lang),
        "gan": translate_gana(chart.gana, lang),
        "varna": translate_varna(chart.varna_bn, lang),
        
        "shubh_bar": translate_comma_separated_weekdays(chart.lucky_days_bn[0], lang),
        "ashubh_bar": translate_comma_separated_weekdays(chart.ashubh_bar_bn[0], lang),
        "shubh_rong": translate_comma_separated_colors(chart.lucky_colors_bn[0], lang),
        "shubh_sonkha": to_local_digits(chart.lucky_numbers_bn[0] if hasattr(chart, 'lucky_numbers_bn') else ", ".join(str(n) for n in chart.lucky_numbers), lang),
        
        "namer_adokkhyor": ALPHABET_MAPS[lang].get(chart.rashi_sign_index, "-"),
        "current_pada_syllable": translate_syllable(chart.nakshatra.current_pada_syllable, lang),
        "all_nakshatra_syllables": [translate_syllable(s, lang) for s in chart.nakshatra.all_nakshatra_syllables],
        "dasha_balance": dasha_balance_str,
    }

    # 7. Formulate shorthand_planets
    sorted_planets = sorted(
        chart.planets,
        key=lambda p: PLANET_DISPLAY_ORDER.index(p.name) if p.name in PLANET_DISPLAY_ORDER else 99,
    )

    shorthand_planets = []
    for p in sorted_planets:
        lon_norm = p.longitude % 360.0
        sign_index_0b = int(lon_norm // 30)
        pos_in_sign = lon_norm % 30.0
        deg = int(pos_in_sign)
        rem = (pos_in_sign - deg) * 60.0
        mins = int(rem)
        secs = int((rem - mins) * 60.0)
        deg_local = to_local_digits(f"{deg:02d}", lang)
        min_local = to_local_digits(f"{mins:02d}", lang)
        sec_local = to_local_digits(f"{secs:02d}", lang)
        sign_index_local = to_local_digits(str(sign_index_0b), lang)
        compact_indexed = f"{sign_index_local} | {deg_local}° {min_local}′ {sec_local}″"

        shorthand_planets.append({
            "short": labels["planets"].get(p.name, p.name),
            "full": p.name,
            "display": compact_indexed,
            "compact": compact_indexed,
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
                abbr = labels["planet_abbr"].get(p.name, p.name)
                NAK_SPAN = 360.0 / 27.0
                nak_1_based = (int(p.longitude / NAK_SPAN) % 27) + 1
                nak_local = to_local_digits(str(nak_1_based), lang)
                house_planets.append(f"{abbr} {nak_local}")

        house_local = to_local_digits(str(house_number), lang)
        house_chart.append({
            "sign_index": sign_idx,
            "house": house_number,
            "house_bn": house_local,
            "is_lagna_house": is_lagna_house,
            "planets": house_planets,
            "planets_text": ", ".join(house_planets),
        })

    # Helper function to calculate age at the start of a period
    def calculate_age_at_start(birth_date: date, start_date: date) -> str:
        if start_date <= birth_date:
            return to_local_digits("0", lang) + " " + labels["days"]
        
        years = start_date.year - birth_date.year
        months = start_date.month - birth_date.month
        days = start_date.day - birth_date.day

        if days < 0:
            months -= 1
            import calendar
            prev_month = start_date.month - 1 if start_date.month > 1 else 12
            prev_year = start_date.year if start_date.month > 1 else start_date.year - 1
            days += calendar.monthrange(prev_year, prev_month)[1]
            
        if months < 0:
            months += 12
            years -= 1
            
        years_local = to_local_digits(str(years), lang)
        months_local = to_local_digits(str(months), lang)
        days_local = to_local_digits(str(days), lang)
        
        lbl_y = labels["years"]
        lbl_m = labels["months"]
        lbl_d = labels["days"]
        
        if years > 0:
            if months > 0:
                return f"{years_local} {lbl_y} {months_local} {lbl_m}"
            return f"{years_local} {lbl_y}"
        elif months > 0:
            if days > 0:
                return f"{months_local} {lbl_m} {days_local} {lbl_d}"
            return f"{months_local} {lbl_m}"
        else:
            return f"{days_local} {lbl_d}"

    # 9. Formulate dasha_list (Enriched with Age profiles)
    from app.astrology.calculations import _calendar_ymd_diff

    dasha_list = []
    for d in chart.mahadasha_list:
        is_active = d.start_date <= current_date < d.end_date
        age_at_start = calculate_age_at_start(payload.dob, d.start_date)
        
        dur_y, dur_m, dur_d = _calendar_ymd_diff(d.start_date, d.end_date)
        
        dasha_list.append({
            "planet": d.planet,
            "planet_bn": labels["planets"].get(d.planet, d.planet),
            "years": to_local_digits(str(d.years), lang),
            "start": to_local_digits(d.start_date.strftime("%d-%m-%Y"), lang),
            "end": to_local_digits(d.end_date.strftime("%d-%m-%Y"), lang),
            "dur_y": to_local_digits(str(dur_y), lang),
            "dur_m": to_local_digits(str(dur_m), lang),
            "dur_d": to_local_digits(str(dur_d), lang),
            "age_bn": age_at_start,
            "is_active": is_active,
        })

    # 10. Formulate antardasha_list
    antardasha_list = []
    for d in chart.mahadasha_list:
        subperiods = []
        for ad in d.antardashas:
            subperiods.append({
                "lord": ad.planet,
                "lord_bn": labels["planets"].get(ad.planet, ad.planet),
                "start": to_local_digits(ad.start_date.strftime("%d-%m-%Y"), lang),
                "end": to_local_digits(ad.end_date.strftime("%d-%m-%Y"), lang),
            })
        antardasha_list.append({
            "major_lord": d.planet,
            "major_bn": labels["planets"].get(d.planet, d.planet),
            "subperiods": subperiods,
        })

    # 10b. Flatten antardashas (Enriched with Age profiles)
    flattened_antardashas: list[dict[str, Any]] = []
    for d in chart.mahadasha_list:
        for ad in d.antardashas:
            age_at_start = calculate_age_at_start(payload.dob, ad.start_date)
            age_at_end = calculate_age_at_start(payload.dob, ad.end_date)
            
            flattened_antardashas.append({
                "major_lord": d.planet,
                "major_bn": labels["planet_abbr"].get(d.planet, d.planet),
                "lord": ad.planet,
                "lord_bn": labels["planet_abbr"].get(ad.planet, ad.planet),
                "start": to_local_digits(ad.start_date.strftime("%d-%m-%Y"), lang),
                "end": to_local_digits(ad.end_date.strftime("%d-%m-%Y"), lang),
                "start_date": ad.start_date,
                "end_date": ad.end_date,
                "age_bn": age_at_start,
                "age_end_bn": age_at_end,
                "mahadasha_bn": labels["planets"].get(d.planet, d.planet),
                "antardasha_bn": labels["planets"].get(ad.planet, ad.planet),
                "start_date_bn": to_local_digits(ad.start_date.strftime("%Y - %m - %d"), lang),
                "end_date_bn": to_local_digits(ad.end_date.strftime("%Y - %m - %d"), lang),
                "dur_y": to_local_digits(str(ad.duration_years), lang),
                "dur_m": to_local_digits(str(ad.duration_months), lang),
                "dur_d": to_local_digits(str(ad.duration_days), lang),
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
        future_antardashas = flattened_antardashas[9:]
    else:
        future_antardashas = flattened_antardashas[active_antardasha_index + 9:]

    for row in current_antardashas:
        planet_major = row.get("major_lord", row.get("major_bn"))
        planet_lord = row.get("lord", row.get("lord_bn"))
        row["major_bn"] = labels["planet_abbr"].get(planet_major, planet_major)
        row["lord_bn"] = labels["planet_abbr"].get(planet_lord, planet_lord)
        row["start"] = to_local_digits(row["start_date"].strftime("%d-%m-%Y"), lang)
        row["end"] = to_local_digits(row["end_date"].strftime("%d-%m-%Y"), lang)
        row["dur_y"] = to_local_digits(str(row.get("dur_y", "")), lang) if row.get("dur_y") else to_local_digits(str(row.get("duration_years", "")), lang)
        row["dur_m"] = to_local_digits(str(row.get("dur_m", "")), lang) if row.get("dur_m") else to_local_digits(str(row.get("duration_months", "")), lang)
        row["dur_d"] = to_local_digits(str(row.get("dur_d", "")), lang) if row.get("dur_d") else to_local_digits(str(row.get("duration_days", "")), lang)
        row["mahadasha_bn"] = labels["planets"].get(planet_major, planet_major)
        row["antardasha_bn"] = labels["planets"].get(planet_lord, planet_lord)

    for row in future_antardashas:
        planet_major = row.get("major_lord", row.get("major_bn"))
        planet_lord = row.get("lord", row.get("lord_bn"))
        row["major_bn"] = labels["planet_abbr"].get(planet_major, planet_major)
        row["lord_bn"] = labels["planet_abbr"].get(planet_lord, planet_lord)
        row["start"] = to_local_digits(row["start_date"].strftime("%d-%m-%Y"), lang)
        row["end"] = to_local_digits(row["end_date"].strftime("%d-%m-%Y"), lang)
        row["dur_y"] = to_local_digits(str(row.get("dur_y", "")), lang) if row.get("dur_y") else to_local_digits(str(row.get("duration_years", "")), lang)
        row["dur_m"] = to_local_digits(str(row.get("dur_m", "")), lang) if row.get("dur_m") else to_local_digits(str(row.get("duration_months", "")), lang)
        row["dur_d"] = to_local_digits(str(row.get("dur_d", "")), lang) if row.get("dur_d") else to_local_digits(str(row.get("duration_days", "")), lang)
        row["mahadasha_bn"] = labels["planets"].get(planet_major, planet_major)
        row["antardasha_bn"] = labels["planets"].get(planet_lord, planet_lord)

    # 11. Formulate empty/dummy kundli_grid matching types
    kundli_grid = [[{"empty": True} for _ in range(4)] for _ in range(4)]

    def calculate_planet_coords(lagna_sign_index: int, house_chart_list: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
        centers = {
            0:  {"x": 150, "y": 50},
            1:  {"x": 67,  "y": 33},
            2:  {"x": 33,  "y": 67},
            3:  {"x": 50,  "y": 150},
            4:  {"x": 33,  "y": 233},
            5:  {"x": 67,  "y": 267},
            6:  {"x": 150, "y": 250},
            7:  {"x": 233, "y": 267},
            8:  {"x": 267, "y": 233},
            9:  {"x": 250, "y": 150},
            10: {"x": 267, "y": 67},
            11: {"x": 233, "y": 33}
        }

        def get_lagna_coords(sign_idx: int) -> dict[str, float]:
            coords_map = {
                0: {"x": 150, "y": 16},
                1: {"x": 84,  "y": 22},
                2: {"x": 22,  "y": 84},
                3: {"x": 16,  "y": 150},
                4: {"x": 22,  "y": 216},
                5: {"x": 84,  "y": 278},
                6: {"x": 150, "y": 284},
                7: {"x": 216, "y": 278},
                8: {"x": 278, "y": 216},
                9: {"x": 284, "y": 150},
                10: {"x": 278, "y": 84},
                11: {"x": 216, "y": 22}
            }
            return coords_map.get(sign_idx, {"x": 150, "y": 150})

        coords_dict = {}
        
        base = get_lagna_coords(lagna_sign_index)
        # Symmetrical lagna keys across languages
        coords_dict["ল"] = {"x": base["x"], "y": base["y"]}
        coords_dict["লং"] = coords_dict["ল"]
        coords_dict["लंग"] = coords_dict["ল"]
        coords_dict["Lagn"] = coords_dict["ল"]

        for sign_idx, house in enumerate(house_chart_list):
            items = house.get("planets", [])
            if not items:
                continue

            count = len(items)
            is_corner_house = sign_idx in [1, 2, 4, 5, 7, 8, 10, 11]
            cx = centers[sign_idx]["x"]
            cy = centers[sign_idx]["y"]

            for idx, item_name in enumerate(items):
                if is_corner_house:
                    is_pos_slope = sign_idx in [1, 2, 7, 8]
                    max_diagonal_span = 64.0
                    base_step = 14.0
                    step = min(base_step, max_diagonal_span / max(count, 1))
                    dx = step
                    dy = step if is_pos_slope else -step
                    offset = idx - (count - 1) / 2.0
                    base_x = cx + offset * dx
                    base_y = cy + offset * dy
                else:
                    cols = 3 if count >= 5 else (2 if count >= 2 else 1)
                    rows = (count + cols - 1) // cols
                    max_width = 64.0
                    max_height = 64.0
                    base_col_spacing = 24.0
                    base_row_spacing = 16.0
                    col_spacing = min(base_col_spacing, max_width / max(cols, 1))
                    row_spacing = min(base_row_spacing, max_height / max(rows, 1))
                    row = idx // cols
                    col_in_row = idx % cols
                    items_in_this_row = min(cols, count - row * cols)
                    offset_x = (col_in_row - (items_in_this_row - 1) / 2.0) * col_spacing
                    offset_y = (row - (rows - 1) / 2.0) * row_spacing
                    base_x = cx + offset_x
                    base_y = cy + offset_y

                coords_dict[item_name] = {
                    "x": base_x,
                    "y": base_y
                }

        return coords_dict

    planet_coords = calculate_planet_coords(chart.lagna_sign_index, house_chart)
    
    frontend_nudges = getattr(payload, 'planet_nudges', None)
    if frontend_nudges is None:
        if hasattr(payload, 'model_dump'):
            frontend_nudges = payload.model_dump().get('planet_nudges')
        elif hasattr(payload, 'dict'):
            frontend_nudges = payload.dict().get('planet_nudges')
        elif isinstance(payload, dict):
            frontend_nudges = payload.get('planet_nudges')
            
    if frontend_nudges:
        for p_name, nudge in frontend_nudges.items():
            if p_name in planet_coords and isinstance(nudge, dict):
                planet_coords[p_name]["x"] += nudge.get("dx", 0)
                planet_coords[p_name]["y"] += nudge.get("dy", 0)
                
        # Handle coordinate nudging key sync for lagna display tags
        active_lagna_key = labels["lang_lagna_display"]
        lagna_nudge = frontend_nudges.get("ল") or frontend_nudges.get("লং") or frontend_nudges.get("लंग") or frontend_nudges.get("Lagn")
        if lagna_nudge and isinstance(lagna_nudge, dict):
            for k in ["ল", "লং", "लंग", "Lagn", active_lagna_key]:
                if k in planet_coords:
                    planet_coords[k]["x"] += lagna_nudge.get("dx", 0)
                    planet_coords[k]["y"] += lagna_nudge.get("dy", 0)

    frontend_remedies = getattr(payload, 'remedies_list', None)
    if frontend_remedies is None:
        if hasattr(payload, 'model_dump'):
            frontend_remedies = payload.model_dump().get('remedies_list')
        elif hasattr(payload, 'dict'):
            frontend_remedies = payload.dict().get('remedies_list')
        elif isinstance(payload, dict):
            frontend_remedies = payload.get('remedies_list')

    # Remedies list localization mapping
    id_map = {"১": 1, "২": 2, "৩": 3, "৪": 4, "৫": 5, "৬": 6, "৭": 7, "৮": 8, "৯": 9,
              "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
              "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9}
    
    local_base_remedies = REMEDIES_TRANSLATIONS[lang]
    if frontend_remedies:
        remedies = []
        for item in frontend_remedies:
            item_id_str = str(item.get("id", ""))
            item_idx = id_map.get(item_id_str, 1) - 1
            if 0 <= item_idx < 9:
                base_item = local_base_remedies[item_idx]
                remedies.append({
                    "id": base_item["id"],
                    "gemstone": base_item["gemstone"],
                    "remedy_root": base_item["remedy_root"],
                    "gemstone_rating": item.get("gemstone_rating", 0),
                    "root_rating": item.get("root_rating", 0),
                })
            else:
                remedies.append(item)
    else:
        remedies = []
        for base_item in local_base_remedies:
            remedies.append({
                "id": base_item["id"],
                "gemstone": base_item["gemstone"],
                "remedy_root": base_item["remedy_root"],
                "gemstone_rating": 0,
                "root_rating": 0,
            })

    from app.astrology.lagna_table import get_daily_lagna_timeline, SIGN_TO_INDEX
    
    month_name_en = BENGALI_MONTHS_EN[bm]
    raw_timeline = get_daily_lagna_timeline(
        month_name_en, 
        bd, 
        use_sidereal=True,
        dob=dob,
        lat=loc.latitude,
        lon=loc.longitude
    )
    
    lagna_time_range = ""
    for item in raw_timeline:
        sign_idx = SIGN_TO_INDEX.get(item["name_en"], 0)
        if sign_idx == chart.lagna_sign_index:
            def format_time_dot(t_str: str) -> str:
                h, m = t_str.split(":")
                return f"{int(h)}.{m}"
            start_local = to_local_digits(format_time_dot(item["start"]), lang)
            end_local = to_local_digits(format_time_dot(item["end"]), lang)
            lagna_time_range = f"{start_local} - {end_local}"
            break

    lagna_lon = chart.ascendant_longitude % 360.0
    lagna_sign_idx_0b = int(lagna_lon // 30)
    lagna_pos_in_sign = lagna_lon % 30.0
    l_deg = int(lagna_pos_in_sign)
    l_rem = (lagna_pos_in_sign - l_deg) * 60.0
    l_mins = int(l_rem)
    l_secs = int((l_rem - l_mins) * 60.0)
    
    l_deg_local = to_local_digits(f"{l_deg:02d}", lang)
    l_min_local = to_local_digits(f"{l_mins:02d}", lang)
    l_sec_local = to_local_digits(f"{l_secs:02d}", lang)
    l_sign_index_local = to_local_digits(str(lagna_sign_idx_0b), lang)
    lagna_compact_indexed = f"{l_sign_index_local} | {l_deg_local}° {l_min_local}′ {l_sec_local}″"

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
        "future_antardashas": future_antardashas,
        "planet_coords": planet_coords,
        "remedies_list": remedies,
        "lagna_time_range": lagna_time_range,
        "lagna_compact_indexed": lagna_compact_indexed,
        "labels": labels,
        "lang": lang,
        "digit_map": digit_map,
    }



def render_pdf_from_context(context: dict[str, Any], filename: str = None) -> str:
    import sys
    # Set up Jinja2 environment and load template
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        templates_dir = Path(sys._MEIPASS) / "app" / "pdf" / "templates"
    else:
        templates_dir = Path(__file__).parent / "templates"
        
    env = Environment(loader=FileSystemLoader(str(templates_dir)))
    template = env.get_template("bengali_report.html")
    html_content = template.render(**context)

    # Output file setup in the backend's generated directory
    if getattr(sys, 'frozen', False):
        backend_root = Path(sys.executable).parent
    else:
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
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--no-first-run",
                "--no-zygote",
                "--single-process"
            ]
        )
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
    
    # Dynamically extract layout toggles from payload, defaulting to True
    def get_toggle(field_name: str, default: bool = True) -> bool:
        val = getattr(payload, field_name, None)
        if val is not None: return val
        if hasattr(payload, 'model_dump') and payload.model_dump().get(field_name) is not None:
            return payload.model_dump().get(field_name)
        if hasattr(payload, 'dict') and payload.dict().get(field_name) is not None:
            return payload.dict().get(field_name)
        return default

    context["show_kundli"] = get_toggle("show_kundli", True)
    context["show_mahadasha"] = get_toggle("show_mahadasha", True)
    context["show_antardasha"] = get_toggle("show_antardasha", True)
    context["show_lucky_info"] = get_toggle("show_lucky_info", True)
    context["show_future_antardashas"] = get_toggle("show_future_antardashas", True)
    
    pdf_url = render_pdf_from_context(context)
    return PdfReportResult(pdf_url=pdf_url)
