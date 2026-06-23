"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PdfViewer } from "../../components/PdfViewer";
import { ReportForm } from "../../components/ReportForm";
import { BengaliDatePicker } from "../../components/BengaliDatePicker";
import { useAuth } from "../../components/AuthProvider";
import AboutModal from "../../components/AboutModal";
import { calculateReport, renderPdf, getPdfStatus, API } from "../../services/api";
import type { ReportInput, ReportState, CustomerState, AstrologyState, DashaRow } from "../../types/report";

const initialValue: ReportInput = {
  name: "",
  father_name: "",
  dob: "2004-08-13",
  time: "14:42",
  place: "Kolkata",
  mobile: "",
  language: "bn",
  bengali_dob: "",
  bengali_date_auto: true,
  planet_overrides: {},
  override_moon_longitude: "",
  override_ascendant_longitude: "",
};

const chartPositions = [
  { x: 150, y: 65, signIndex: 0 },  // মেষ
  { x: 65, y: 35, signIndex: 1 },  // বৃষ
  { x: 35, y: 65, signIndex: 2 },  // মিথুন
  { x: 65, y: 150, signIndex: 3 },  // কর্কট
  { x: 35, y: 235, signIndex: 4 },  // সিংহ
  { x: 65, y: 265, signIndex: 5 },  // কন্যা
  { x: 150, y: 235, signIndex: 6 },  // তুলা
  { x: 235, y: 265, signIndex: 7 },  // বৃশ্চিক
  { x: 265, y: 235, signIndex: 8 },  // ধনু
  { x: 235, y: 150, signIndex: 9 },  // মকর
  { x: 265, y: 65, signIndex: 11 }, // মীন
  { x: 235, y: 35, signIndex: 10 }  // কুম্ভ
];

const PLANET_DISPLAY_ORDER = ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Rahu", "Ketu"];

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const HI_DIGITS = "०१२३४५६७८९";

function toEnglishDigits(text: string): string {
  if (!text) return "";
  let res = text.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));
  res = res.replace(/[०-९]/g, (digit) => String(HI_DIGITS.indexOf(digit)));
  return res;
}

function toBengaliDigits(text: string): string {
  return text.replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)]);
}

function toLocalDigits(text: string, lang?: string): string {
  if (!text) return "";
  if (lang === "hi") {
    return text.replace(/[0-9]/g, (digit) => HI_DIGITS[Number(digit)]);
  } else if (lang === "en") {
    return text;
  } else {
    return text.replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)]);
  }
}

function parsePlanetOverride(compactValue: string): number | null {
  const numericParts = toEnglishDigits(compactValue).match(/\d+/g)?.map((part) => Number(part)) ?? [];
  if (numericParts.length < 3) {
    return null;
  }

  const [signIndex, degrees, minutes, seconds = 0] = numericParts;
  if (![signIndex, degrees, minutes, seconds].every(Number.isFinite)) {
    return null;
  }

  return signIndex * 30 + degrees + minutes / 60 + seconds / 3600;
}

function buildPlanetOverrides(planets: ReportState["shorthand_planets"]): Record<string, number> {
  return planets.reduce<Record<string, number>>((accumulator, planet) => {
    const longitude = parsePlanetOverride(planet.compact_indexed ?? planet.compact ?? "");
    if (longitude !== null) {
      accumulator[planet.full] = longitude;
    }
    return accumulator;
  }, {});
}

function normalizeEditorInput(text: string, lang?: string): string {
  return toLocalDigits(text, lang);
}

const ZODIAC_SIGNS_MAP: Record<string, string[]> = {
  bn: ["মেষ", "বৃষ", "মিথুন", "কর্কট", "সিংহ", "কন্যা", "তুলা", "বৃশ্চিক", "ধনু", "মকর", "কুম্ভ", "মীন"],
  hi: ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"],
  en: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
};

const NAKSHATRAS_MAP: Record<string, string[]> = { //testing
  bn: [
     "অশ্বিনী", "ভরণী", "কৃত্তিকা", "রোহিণী", "মৃগশিরা", "আর্দ্রা",
            "পুনর্ব্বসু", "পুষ্যা", "অশ্লেষা", "মঘা", "পূর্ব্বফল্গুনী",
            "উত্তরফল্গুনী", "হস্তা", "চিত্রা", "স্বাতী", "বিশাখা",
            "অনুরাধা", "জ্যেষ্ঠা", "মূলা", "পূর্ব্বাষাঢ়া", "উত্তরাষাঢ়া",
            "শ্রবণা", "ধনিষ্ঠা", "শতভিষা", "পূর্ব্বভাদ্রপদ",
            "উত্তরভাদ্রপদ", "রেবতী"
  ],
  hi: [
    "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
    "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी",
    "उत्तराफाल्गुनी", "हस्त", "चित्रा", "स्वाती", "विशाखा",
    "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा",
    "श्रवण", "धनिष्ठा", "शतभीषा", "पूर्वाभाद्रपद",
    "उत्तराभाद्रपद", "रेवती"
  ],
  en: [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
    "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati"
  ],
};

const PADAS_MAP: Record<string, string[]> = {
  bn: ["১", "২", "৩", "৪"],
  hi: ["१", "२", "३", "४"],
  en: ["1", "2", "3", "4"]
};

const GANAS_MAP: Record<string, string[]> = {
  bn: ["দেবগণ", "নরগণ", "রাক্ষসগণ"],
  hi: ["देवगण", "मनुष्यगण", "राक्षसगण"],
  en: ["Devagana", "Manushyagana", "Rakshasagana"],
};

const VARNAS_MAP: Record<string, string[]> = {
  bn: ["ব্রাহ্মণ", "বিপ্র", "ক্ষত্রিয়", "বৈশ্য", "শূদ্র"],
  hi: ["ब्राह्मण", "विप्र", "क्षत्रिय", "वैश्य", "शूद्र"],
  en: ["Brahmin", "Vipra", "Kshatriya", "Vaishya", "Shudra"],
};

const WEEKDAYS_MAP: Record<string, string[]> = {
  bn: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
  hi: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const COLORS_MAP: Record<string, string[]> = {
  bn: ["সাদা", "লাল", "হলুদ", "তামাটে", "সবুজ", "নীলাভ সাদা", "নীল"],
  hi: ["सफेद", "लाल", "पीला", "तांबा", "हरा", "नीला-सफेद", "नीला"],
  en: ["White", "Red", "Yellow", "Copper", "Green", "Bluish White", "Blue"],
};

const NUMBERS_MAP: Record<string, string[]> = {
  bn: ["১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
  hi: ["१", "२", "३", "४", "५", "६", "७", "८", "९"],
  en: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
};

const NAKSHATRA_SYLLABLES_MAP: Record<string, string[][]> = {
  bn: [
    ["চু", "চে", "চো", "লা"], ["লি", "লু", "লে", "লো"], ["আ", "ই", "উ", "এ"],
    ["ও", "বা", "বি", "বু"], ["বে", "বো", "কা", "কি"], ["কু", "ঘ", "ঙ", "ছ"],
    ["কে", "কো", "হা", "হি"], ["হু", "হে", "হো", "ডা"], ["ডি", "ডু", "ডে", "ডো"],
    ["মা", "মি", "মু", "মে"], ["মো", "টা", "টি", "টু"], ["টে", "টো", "পা", "পি"],
    ["পু", "ষ", "ণ", "ঠ"], ["পে", "পো", "রা", "রি"], ["রু", "রে", "রো", "তা"],
    ["তি", "তু", "তে", "তো"], ["না", "নি", "নু", "নে"], ["নো", "যা", "যি", "যু"],
    ["যে", "যো", "ভা", "ভি"], ["ভু", "ধা", "ফা", "ঢা"], ["ভে", "ভো", "জা", "জি"],
    ["খি", "খু", "খে", "খো"], ["গা", "গি", "গু", "গে"],
    ["গো", "সা", "সি", "সু"], ["সে", "সো", "দা", "দি"], ["দু", "থ", "ঝ", "ঞ"],
    ["দে", "দো", "चा", "चि"] // revati
  ],
  hi: [
    ["चु", "चे", "चो", "ला"], ["ली", "लू", "ले", "लो"], ["अ", "इ", "उ", "ए"],
    ["ओ", "वा", "वि", "वु"], ["वे", "वो", "का", "की"], ["कु", "घ", "ङ", "छ"],
    ["के", "को", "हा", "ही"], ["हु", "हे", "हो", "डा"], ["डि", "डु", "डे", "डो"],
    ["मा", "मी", "मू", "मे"], ["मो", "टा", "टी", "टू"], ["टे", "टो", "पा", "पी"],
    ["पु", "ष", "ण", "ठ"], ["पे", "पो", "रा", "री"], ["रू", "रे", "रो", "ता"],
    ["ती", "तू", "ते", "तो"], ["ना", "नी", "नू", "ने"], ["नो", "या", "यि", "यु"],
    ["ये", "यो", "भा", "भी"], ["भु", "धा", "फा", "ढा"], ["भे", "भो", "जा", "जी"],
    ["खि", "खु", "खे", "खो"], ["गा", "गि", "गु", "गे"],
    ["गो", "सा", "सि", "सु"], ["से", "सो", "दा", "दि"], ["दु", "थ", "झ", "ञ"],
    ["दे", "दो", "चा", "चि"]
  ],
  en: [
    ["Chu", "Che", "Cho", "La"], ["Li", "Lu", "Le", "Lo"], ["A", "I", "U", "E"],
    ["O", "Va", "Vi", "Vu"], ["Ve", "Vo", "Ka", "Ki"], ["Ku", "Gha", "Ing", "Ja"],
    ["Ke", "Ko", "Ha", "Hi"], ["Hu", "He", "Ho", "Da"], ["Di", "Du", "De", "Do"],
    ["Ma", "Mi", "Mu", "Me"], ["Mo", "Ta", "Ti", "Tu"], ["Te", "To", "Pa", "Pi"],
    ["Pu", "Sha", "Na", "Tha"], ["Pe", "Po", "Ra", "Ri"], ["Ru", "Re", "Ro", "Ta"],
    ["Ti", "Tu", "Te", "To"], ["Na", "Ni", "Nu", "Ne"], ["No", "Ya", "Yi", "Yu"],
    ["Ye", "Yo", "Bha", "Bhi"], ["Bhu", "Dha", "Pha", "Dha"], ["Bhe", "Bho", "Ja", "Ji"],
    ["Khi", "Khu", "Khe", "Kho"], ["Ga", "Gi", "Gu", "Ge"],
    ["Go", "Sa", "Si", "Su"], ["Se", "So", "Da", "Di"], ["Du", "Tha", "Jha", "Da"],
    ["De", "Do", "Cha", "Chi"]
  ]
};

const NAKSHATRA_LORDS_MAP: Record<string, string[]> = {
  bn: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি", "রাহু", "কেতু"],
  hi: ["सूर्य", "चन्द्र", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "राहु", "केतु"],
  en: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"],
};

// Rashi-based name letters (matches backend KAKA_RASHI_ALPHABET) — string[] for MultiSelectDropdown
const NAME_LETTERS_MAP: Record<string, string[]> = {
  bn: ["অ / ল", "উ / ব", "ক / ছ", "ড / হ", "ম / ট", "প / ঠ", "র / ত", "ন / ষ", "ধ / ভ", "খ / জ", "গ / শ", "দ / চ"],
  hi: ["अ / ल", "उ / व", "क / छ", "ड / ह", "म / ट", "प / ठ", "र / त", "न / ष", "ध / भ", "ख / ज", "ग / श", "द / च"],
  en: ["A / L", "U / V", "K / C", "D / H", "M / T", "P / T", "R / T", "N / S", "D / B", "K / J", "G / S", "D / C"],
};

const DOSHA_TRANSLATIONS: Record<string, Record<string, string>> = {
  bn: {
    "মাঙ্গলিক": "মাঙ্গলিক",
    "আংশিক মাঙ্গলিক": "আংশিক মাঙ্গলিক",
    "কালসর্প দোষ": "কালসর্প দোষ",
    "আংশিক কালসর্প দোষ": "আংশিক কালসর্প দোষ",
    "সাড়েসাতি": "সাড়েসাতি",
    "ধাইয়া": "ধাইয়া"
  },
  en: {
    "মাঙ্গলিক": "Manglik",
    "আংশিক মাঙ্গলিক": "Anshik Manglik",
    "কালসর্প দোষ": "Kalsarpa Dosha",
    "আংশিক কালসর্প দোষ": "Anshik Kalsarpa Dosha",
    "সাড়েসাতি": "Sade Sati",
    "ধাইয়া": "Dhaiya"
  },
  hi: {
    "মাঙ্গলিক": "मांगलिक",
    "আংশিক মাঙ্গলিক": "आंशिक मांगलिक",
    "কালসর্প দোষ": "कालसर्प दोष",
    "আংশিক कालसर्प दोष": "आंशिक कालसर्प दोष",
    "সাড়েসাতি": "साढ़ेसाती",
    "ধাইয়া": "धैया"
  }
};

function translateDoshas(doshas: string[], fromLang: string, toLang: string): string[] {
  const fromMap = DOSHA_TRANSLATIONS[fromLang] || DOSHA_TRANSLATIONS.bn;
  const toMap = DOSHA_TRANSLATIONS[toLang] || DOSHA_TRANSLATIONS.bn;
  
  const toCanonical = (dosha: string): string => {
    for (const [canonical, trans] of Object.entries(fromMap)) {
      if (trans === dosha || canonical === dosha) {
        return canonical;
      }
    }
    return dosha;
  };

  return doshas.map(d => {
    const canonical = toCanonical(d);
    return toMap[canonical] || canonical;
  });
}


interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (newValue: string) => void;
}

function MultiSelectDropdown({ label, options, value, onChange }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItems = useMemo(() => {
    return value ? value.split(",").map((s) => s.trim()) : [];
  }, [value]);

  const handleToggle = (item: string) => {
    let next: string[];
    if (selectedItems.includes(item)) {
      next = selectedItems.filter((x) => x !== item);
    } else {
      next = [...selectedItems, item];
    }
    onChange(next.join(", "));
  };

  return (
    <div className="relative flex items-center gap-1 w-full text-[0.625rem]">
      <span className="font-semibold text-slate-500 w-20 shrink-0">{label}:</span>
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-0.5 rounded w-full border text-left bg-white text-[0.6875rem] flex justify-between items-center select-none"
          style={{ borderColor: "#e2e8f0" }}
        >
          <span className="truncate">{value || "Select..."}</span>
          <i className="fa-solid fa-chevron-down text-[0.5625rem] text-slate-400"></i>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-[#cbd5e1] rounded shadow-lg z-30 p-1 flex flex-col gap-1">
              {options.map((opt) => {
                const isChecked = selectedItems.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-[0.6875rem] select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt)}
                      className="rounded h-3.5 w-3.5 text-indigo-650 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-slate-700">{opt}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface LetterPickerProps {
  alphabetMap: Record<number, string>;
  zodiacSigns: string[];
  currentRashi: string;
  value: string;
  onChange: (newValue: string) => void;
}

function LetterPickerDropdown({ alphabetMap, zodiacSigns, currentRashi, value, onChange }: LetterPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rashiIndex = zodiacSigns.indexOf(currentRashi);

  const selectedLetters = useMemo(() => {
    return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, [value]);

  const handleLetterToggle = (letter: string) => {
    let next: string[];
    if (selectedLetters.includes(letter)) {
      next = selectedLetters.filter((x) => x !== letter);
    } else {
      next = [...selectedLetters, letter];
    }
    onChange(next.join(", "));
  };

  const allOptions = Object.entries(alphabetMap).map(([idx, letter]) => ({
    index: Number(idx),
    letter: letter as string,
    rashi: zodiacSigns[Number(idx)] || "",
    isRecommended: Number(idx) === rashiIndex,
  }));

  return (
    <div className="relative">
      <div
        className="rounded px-1.5 py-1 w-full border border-slate-200 cursor-pointer text-[0.6875rem] font-semibold flex items-center justify-between min-h-[26px]"
        style={{ background: "rgba(248, 250, 252, 0.5)" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-slate-700">
          {selectedLetters.length > 0 ? selectedLetters.join(", ") : "Select letters..."}
        </span>
        <i className="fa-solid fa-chevron-down text-[0.5625rem] text-slate-400 ml-1"></i>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[#cbd5e1] rounded shadow-lg z-30 p-1.5 flex flex-col gap-0.5">
            {allOptions.map(({ index, letter, rashi, isRecommended }) => {
              const isChecked = selectedLetters.includes(letter);
              return (
                <label
                  key={index}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[0.6875rem] select-none transition-colors ${isRecommended
                    ? "bg-amber-50 border border-amber-200 font-semibold"
                    : "hover:bg-slate-50"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleLetterToggle(letter)}
                    className="rounded h-3.5 w-3.5 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span className={isRecommended ? "text-amber-800" : "text-slate-700"}>
                    {letter}
                  </span>
                  <span className="text-[0.5rem] text-slate-400 ml-auto">
                    {rashi}{isRecommended ? " ★" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function buildRequestPayload(formValue: ReportInput, reportState: ReportState | null): ReportInput {
  const planetOverrides = {
    ...(reportState ? buildPlanetOverrides(reportState.shorthand_planets) : {}),
    ...(reportState?.planet_overrides || {}),
    ...(formValue.planet_overrides || {}) // Drag & Drop হওয়া সর্বশেষ পজিশনকে প্রাধান্য দেওয়া হবে
  };
  const overrideAscendantRaw = formValue.override_ascendant_longitude?.trim();
  const overrideAscendant = overrideAscendantRaw ? Number(overrideAscendantRaw) : undefined;

  return {
    ...formValue,
    planet_overrides: planetOverrides,
    override_moon_longitude: formValue.override_moon_longitude?.trim() || undefined,
    override_ascendant_longitude: Number.isFinite(overrideAscendant) ? String(overrideAscendant) : undefined,
    planet_nudges: reportState?.planet_nudges || {},
    bengali_dob: formValue.bengali_date_auto ? undefined : (formValue.bengali_dob?.trim() || undefined),
  } as any;
}
function calculatePlanetCoords(state: ReportState): Record<string, { x: number, y: number }> {
  const coords: Record<string, { x: number, y: number }> = {};
  const lagnaIdx = state.summary.lagna_sign_index ?? 0;

  // FIXED: Symmetrical Anchor Points mapped precisely near structural dividing line intersections
  const houseLayout = [
    { numX: 150, numY: -10, planetsX: 150, planetsY: 34, poly: "100,100 200,100 150,0", signIdx: 0 },
    { numX: 72, numY: -10, planetsX: 95, planetsY: 12, poly: "0,0 100,0 100,100", signIdx: 1 },
    { numX: -12, numY: 68, planetsX: 12, planetsY: 95, poly: "0,0 0,100 100,100", signIdx: 2 },
    { numX: -12, numY: 140, planetsX: 34, planetsY: 140, poly: "100,100 100,200 0,150", signIdx: 3 },
    { numX: -12, numY: 212, planetsX: 12, planetsY: 205, poly: "0,200 0,300 100,200", signIdx: 4 },
    { numX: 72, numY: 320, planetsX: 95, planetsY: 288, poly: "100,200 100,300 0,300", signIdx: 5 },
    { numX: 150, numY: 320, planetsX: 150, planetsY: 266, poly: "100,200 200,200 150,300", signIdx: 6 },
    { numX: 228, numY: 320, planetsX: 205, planetsY: 288, poly: "200,200 200,300 300,300", signIdx: 7 },
    { numX: 312, numY: 212, planetsX: 288, planetsY: 205, poly: "200,200 300,200 300,300", signIdx: 8 },
    { numX: 312, numY: 140, planetsX: 266, planetsY: 140, poly: "200,100 200,200 300,150", signIdx: 9 },
    { numX: 312, numY: 68, planetsX: 288, planetsY: 95, poly: "300,0 200,100 300,100", signIdx: 10 },
    { numX: 228, numY: -10, planetsX: 205, planetsY: 12, poly: "200,0 300,0 200,100", signIdx: 11 }
  ];

  // The true geometric centers (Center of Mass) for all 12 Bengali Chart cells
  const centers = {
    0: { x: 150, y: 50 },
    1: { x: 67, y: 33 },
    2: { x: 33, y: 67 },
    3: { x: 50, y: 150 },
    4: { x: 33, y: 233 },
    5: { x: 67, y: 267 },
    6: { x: 150, y: 250 },
    7: { x: 233, y: 267 },
    8: { x: 267, y: 233 },
    9: { x: 250, y: 150 },
    10: { x: 267, y: 67 },
    11: { x: 233, y: 33 }
  };

  const getLagnaCoords = (signIdx: number): { x: number; y: number } => {
    switch (signIdx) {
      case 0: return { x: 150, y: 16 };
      case 1: return { x: 84, y: 22 };
      case 2: return { x: 22, y: 84 };
      case 3: return { x: 16, y: 150 };
      case 4: return { x: 22, y: 216 };
      case 5: return { x: 84, y: 278 };
      case 6: return { x: 150, y: 284 };
      case 7: return { x: 216, y: 278 };
      case 8: return { x: 278, y: 216 };
      case 9: return { x: 284, y: 150 };
      case 10: return { x: 278, y: 84 };
      case 11: return { x: 216, y: 22 };
      default: return { x: 150, y: 150 };
    }
  };

  houseLayout.forEach((layout) => {
    if (layout.signIdx === lagnaIdx) {
      const nudge = state.planet_nudges?.["ল"] || { dx: 0, dy: 0 };
      const base = getLagnaCoords(layout.signIdx);
      coords["ল"] = {
        x: base.x + nudge.dx,
        y: base.y + nudge.dy
      };
    }

    const items: string[] = [];
    const house = state.house_chart[layout.signIdx];
    if (house && house.planets) {
      items.push(...house.planets);
    }

    if (items.length === 0) return;

    const count = items.length;
    const isCornerHouse = [1, 2, 4, 5, 7, 8, 10, 11].includes(layout.signIdx);
    const houseCoords: { name: string; x: number; y: number }[] = [];

    items.forEach((itemName, idx) => {
      let baseX = 0;
      let baseY = 0;
      const Cx = centers[layout.signIdx as keyof typeof centers].x;
      const Cy = centers[layout.signIdx as keyof typeof centers].y;

      if (isCornerHouse) {
        // ── 1. CORNER HOUSES: Grouped Diagonal Alignment ──
        const isPositiveSlope = [1, 2, 7, 8].includes(layout.signIdx);

        // Define usable diagonal span bounding limit
        const MAX_DIAGONAL_SPAN = 64;
        const BASE_STEP = 14;

        // Compress step if total expected span exceeds boundaries
        const step = Math.min(BASE_STEP, MAX_DIAGONAL_SPAN / Math.max(count, 1));

        const dx = step;
        const dy = isPositiveSlope ? step : -step;

        const offset = idx - (count - 1) / 2.0;

        baseX = Cx + offset * dx;
        baseY = Cy + offset * dy;
      } else {
        // ── 2. SQUARE HOUSES: Centered Bounding Matrix ──
        const cols = count >= 5 ? 3 : (count >= 2 ? 2 : 1);
        const rows = Math.ceil(count / cols);

        // Define usable bounding box limits for square houses
        const MAX_WIDTH = 64;
        const MAX_HEIGHT = 64;

        const BASE_COL_SPACING = 24;
        const BASE_ROW_SPACING = 16;

        // Dynamically shrink spacing to fit inside the bounding box
        const colSpacing = Math.min(BASE_COL_SPACING, MAX_WIDTH / Math.max(cols, 1));
        const rowSpacing = Math.min(BASE_ROW_SPACING, MAX_HEIGHT / Math.max(rows, 1));

        const row = Math.floor(idx / cols);
        const colInRow = idx % cols;
        const itemsInThisRow = Math.min(cols, count - row * cols);

        const offsetX = (colInRow - (itemsInThisRow - 1) / 2.0) * colSpacing;
        const offsetY = (row - (rows - 1) / 2.0) * rowSpacing;

        baseX = Cx + offsetX;
        baseY = Cy + offsetY;
      }

      houseCoords.push({ name: itemName, x: baseX, y: baseY });
    });

    houseCoords.forEach((coord) => {
      const nudge = state.planet_nudges?.[coord.name] || { dx: 0, dy: 0 };
      coords[coord.name] = {
        x: coord.x + nudge.dx,
        y: coord.y + nudge.dy
      };
    });
  });

  return coords;
}

export default function CreateReportPage() {
  const router = useRouter();
  const { user, isAdmin, isAuthenticated, isLoading: authLoading, logout, token } = useAuth();
  const [formValue, setFormValue] = useState<ReportInput>(initialValue);
  const [reportState, setReportState] = useState<ReportState | null>(null);
  const [activePlanet, setActivePlanet] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [compiledPdfUrl, setCompiledPdfUrl] = useState("");
  const [pdfLanguage, setPdfLanguage] = useState<string>("bn");
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [showBirthDetails, setShowBirthDetails] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMahadasha, setPopupMahadasha] = useState("");
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [compilationStatus, setCompilationStatus] = useState("");
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [selectedDoshaInput, setSelectedDoshaInput] = useState("");

  // Nudge the selected planet position
  const nudgeSelectedPlanet = (dx: number, dy: number) => {
    if (!selectedPlanet || !reportState) return;
    setReportState((prev) => {
      if (!prev) return prev;
      const nudges = prev.planet_nudges || {};
      const current = nudges[selectedPlanet] || { dx: 0, dy: 0 };
      return {
        ...prev,
        planet_nudges: {
          ...nudges,
          [selectedPlanet]: {
            dx: current.dx + dx,
            dy: current.dy + dy,
          },
        },
      };
    });
  };

  // Keyboard listener for nudging selected planet
  useEffect(() => {
    if (!selectedPlanet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 2; // move 2px per click
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else return;

      e.preventDefault();
      nudgeSelectedPlanet(dx, dy);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlanet, reportState]);

  // Check for pending birth details on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("pending_birth_details");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ReportInput;
          setFormValue(parsed);
          sessionStorage.removeItem("pending_birth_details");
          handleLoadDetails(parsed);
        } catch (e) {
          console.error("Error parsing stored birth details", e);
        }
      }
    }
  }, []);

  // Trigger recalculation when form language changes, if a report is already loaded
  useEffect(() => {
    if (reportState) {
      handleLoadDetails(formValue);
    }
  }, [formValue.language]);



  // Trigger PDF preview recalculation when the target PDF language changes, independently of editor state
  useEffect(() => {
    if (reportState && pdfLanguage !== reportState.lang) {
      handleLoadPdfForLanguage(pdfLanguage);
    }
  }, [pdfLanguage]);

  const fullPdfUrl = useMemo(() => (pdfUrl ? (pdfUrl.startsWith("blob:") ? pdfUrl : `${process.env.NEXT_PUBLIC_API_URL || "https://sanglap-astro-web.onrender.com"}${pdfUrl}`) : ""), [pdfUrl]);

  // Load the initial calculation from backend into central state
  async function handleLoadDetails(overrideValue?: ReportInput, keepFormOpen?: boolean) {
    setLoading(true);
    setError("");
    if (!pdfUrl) {
      setPdfUrl("");
    }
    try {
      const activeFormValue = overrideValue || formValue;
      setPdfLanguage(activeFormValue.language ?? "bn");
      const state = await calculateReport(buildRequestPayload(activeFormValue, null));

      // Determine default active planet
      const activeDasha = state.dasha_list.find((d) => d.is_active);
      setActivePlanet(activeDasha ? activeDasha.planet : state.dasha_list[0].planet);

      // Collapse the form automatically upon loading (unless keepFormOpen is true)
      if (!keepFormOpen) {
        setShowBirthDetails(false);
      }

      const stateWithCoords: ReportState = {
        ...state,
        planet_overrides: buildPlanetOverrides(state.shorthand_planets),
      };

      const planet_coords = calculatePlanetCoords(stateWithCoords);
      stateWithCoords.planet_coords = planet_coords;

      setReportState(stateWithCoords);
      setFormValue((prev) => ({
        ...prev,
        bengali_dob: state.customer.bengali_dob,
      }));

      // Immediately render default PDF
      const result = await renderPdf(stateWithCoords);
      setPdfUrl(result.preview_url);
      setCompiledPdfUrl(result.compiled_pdf_url);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  // Load/compile the PDF in a specific language without updating the visual editor state
  async function handleLoadPdfForLanguage(lang: string, overrideState?: ReportState) {
    const activeState = overrideState || reportState;
    if (!activeState) return;
    setLoading(true);
    setError("");
    try {
      const tempFormValue = { ...formValue, language: lang };
      const state = await calculateReport(buildRequestPayload(tempFormValue, activeState));
      const stateWithCoords: ReportState = {
        ...state,
        planet_overrides: buildPlanetOverrides(state.shorthand_planets),
        // Preserve editor toggles
        show_kundli: activeState.show_kundli,
        show_mahadasha: activeState.show_mahadasha,
        show_antardasha: activeState.show_antardasha,
        show_lucky_info: activeState.show_lucky_info,
        show_future_antardashas: (activeState as any).show_future_antardashas,
        // Preserve antardasha display rows
        antardasha_display_rows: activeState.antardasha_display_rows,
        // Preserve remedies ratings
        remedies_list: (activeState as any).remedies_list,
      };

      // Preserve and translate selected doshas
      if (activeState.summary.selected_doshas) {
        stateWithCoords.summary.selected_doshas = translateDoshas(
          activeState.summary.selected_doshas,
          "bn", // Visual editor (activeState) is ALWAYS in Bengali
          lang
        );
      }

      const planet_coords = calculatePlanetCoords(stateWithCoords);
      stateWithCoords.planet_coords = planet_coords;

      const result = await renderPdf(stateWithCoords);
      setPdfUrl(result.preview_url);
      setCompiledPdfUrl(result.compiled_pdf_url);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "PDF rendering failed");
    } finally {
      setLoading(false);
    }
  }

  // Determine whether to call handleRenderPdf (direct render) or handleLoadPdfForLanguage (translate & render)
  const triggerPdfUpdate = (updatedState: ReportState) => {
    if (pdfLanguage === "bn") {
      handleRenderPdf(updatedState);
    } else {
      handleLoadPdfForLanguage(pdfLanguage, updatedState);
    }
  };

  // Render the PDF from the current edited ReportState
  async function handleRenderPdf(overrideState?: ReportState) {
    const activeState = overrideState || reportState;
    if (!activeState) return;
    setRendering(true);
    setError("");
    try {
      const planet_coords = calculatePlanetCoords(activeState);
      const stateToRender: ReportState = {
        ...activeState,
        lang: pdfLanguage,
        planet_coords: planet_coords,
      };

      if (!overrideState) {
        setReportState(activeState);
      }

      const result = await renderPdf(stateToRender);
      setPdfUrl(result.preview_url);
      setCompiledPdfUrl(result.compiled_pdf_url);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "PDF rendering failed");
    } finally {
      setRendering(false);
    }
  }

  // Helper to extract key matching planet name
  const groupKey = (group: any) => group.major_lord || group.major_bn || "";

  // State modification helpers
  const updateCustomerField = (field: keyof CustomerState, val: string) => {
    if (!reportState) return;
    setReportState({
      ...reportState,
      customer: { ...reportState.customer, [field]: val },
    });
    if (field === "bengali_dob") {
      setFormValue((prev) => ({ ...prev, bengali_dob: val, bengali_date_auto: false }));
    }
  };

  const updateSummaryField = (field: keyof AstrologyState, val: any) => {
    if (!reportState) return;
    setReportState({
      ...reportState,
      summary: {
        ...reportState.summary,
        [field]: typeof val === "string" ? normalizeEditorInput(val, reportState.lang) : val,
      },
    });
  };

  const updateDashaField = (index: number, field: keyof DashaRow, val: any) => {
    if (!reportState) return;
    const newDashas = [...reportState.dasha_list];
    newDashas[index] = {
      ...newDashas[index],
      [field]: typeof val === "string" ? normalizeEditorInput(val, reportState.lang) : val,
    };
    setReportState({
      ...reportState,
      dasha_list: newDashas,
    });
  };

  const addAntardashaRow = () => {
    if (!reportState) return;
    const activePlanetBn = reportState.dasha_list.find((d) => d.planet === activePlanet)?.planet_bn || activePlanet || "";
    const newRow = {
      major_bn: toLocalDigits(activePlanetBn, reportState.lang),
      lord_bn: "",
      start: "",
      end: "",
      major_lord: activePlanet,
      lord: "",
    };
    setReportState({
      ...reportState,
      antardasha_display_rows: [...(reportState.antardasha_display_rows || []), newRow],
    });
  };

  const removeAntardashaRow = (rowIdx: number) => {
    if (!reportState) return;
    const nextRows = [...(reportState.antardasha_display_rows || [])];
    nextRows.splice(rowIdx, 1);

    const updatedState = {
      ...reportState,
      antardasha_display_rows: nextRows,
    };
    setReportState(updatedState);
    triggerPdfUpdate(updatedState);
  };

  const updateAntardashaRowField = (rowIdx: number, field: "major_bn" | "lord_bn" | "start" | "end", val: string) => {
    if (!reportState) return;
    const nextRows = [...(reportState.antardasha_display_rows || [])];
    nextRows[rowIdx] = {
      ...nextRows[rowIdx],
      [field]: normalizeEditorInput(val, reportState.lang),
    };
    setReportState({
      ...reportState,
      antardasha_display_rows: nextRows,
    });
  };

  const addSelectedAntardasha = (major_bn: string, lord_bn: string, start: string, end: string) => {
    if (!reportState) return;
    const newRow = {
      major_bn: toLocalDigits(major_bn, reportState.lang),
      lord_bn: toLocalDigits(lord_bn, reportState.lang),
      start: toLocalDigits(start, reportState.lang),
      end: toLocalDigits(end, reportState.lang),
      major_lord: activePlanet,
      lord: "",
    };

    const nextRows = [...(reportState.antardasha_display_rows || []), newRow];

    // Sort nextRows by Start Date
    const parseDateStr = (dateStr: string) => {
      const cleanStr = toEnglishDigits(dateStr);
      const parts = cleanStr.split(/[-.\/]/);
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      }
      return 0;
    };
    nextRows.sort((a, b) => parseDateStr(a.start) - parseDateStr(b.start));

    const updatedState = {
      ...reportState,
      antardasha_display_rows: nextRows,
    };
    setReportState(updatedState);
    triggerPdfUpdate(updatedState);
  };

  const updateShorthandPlanet = (planetName: string, field: "display" | "compact_indexed", val: string) => {
    if (!reportState) return;
    const nextShorthands = [...reportState.shorthand_planets];
    const planetIndex = nextShorthands.findIndex((planet) => planet.full === planetName);
    if (planetIndex < 0) return;
    nextShorthands[planetIndex] = { ...nextShorthands[planetIndex], [field]: normalizeEditorInput(val, reportState.lang) };
    setReportState({
      ...reportState,
      shorthand_planets: nextShorthands,
      planet_overrides: buildPlanetOverrides(nextShorthands),
    });
  };

  const sortedShorthandPlanets = reportState
    ? [...reportState.shorthand_planets].sort(
      (left, right) =>
        (PLANET_DISPLAY_ORDER.indexOf(left.full) === -1 ? 99 : PLANET_DISPLAY_ORDER.indexOf(left.full)) -
        (PLANET_DISPLAY_ORDER.indexOf(right.full) === -1 ? 99 : PLANET_DISPLAY_ORDER.indexOf(right.full)),
    )
    : [];

  const updateToggle = (field: "show_kundli" | "show_mahadasha" | "show_antardasha" | "show_lucky_info" | "show_future_antardashas", val: boolean) => {
    if (!reportState) return;
    setReportState({
      ...reportState,
      [field]: val,
    } as any);
  };

  const updateRemedyRating = (index: number, type: "gemstone_rating" | "root_rating", rating: number) => {
    if (!reportState) return;
    // @ts-ignore
    const nextRemedies = [...((reportState as any).remedies_list || [])];
    nextRemedies[index] = { ...nextRemedies[index], [type]: rating };
    const nextState = {
      ...reportState,
      remedies_list: nextRemedies,
    } as any;
    setReportState(nextState);
    triggerPdfUpdate(nextState);
  };

  // Drag and Drop Logic: ড্রপ হলে লোকাল স্টেট এবং ওভাররাইড পেলোড আপডেট করবে
  const handleDropPlanet = (e: React.DragEvent<SVGGElement>, targetHouseIdx: number) => {
    e.preventDefault();
    const planetName = e.dataTransfer.getData("text/plain");
    if (!planetName || !reportState) return;

    const targetSignIdx = (reportState.house_chart[targetHouseIdx] as any)?.sign_index ?? targetHouseIdx;
    if (targetSignIdx === undefined) return;

    const nextHouseChart = [...reportState.house_chart];
    let planetMoved = false;

    // পুরনো ঘর থেকে গ্রহটিকে মুছে ফেলা
    nextHouseChart.forEach((house, i) => {
      if (house.planets.includes(planetName)) {
        const filtered = house.planets.filter(p => p !== planetName);
        nextHouseChart[i] = { ...house, planets: filtered, planets_text: filtered.join("\n") };
        planetMoved = true;
      }
    });

    if (!planetMoved) return; // যদি গ্রহটি আগে থেকে চার্টে না থাকে, তবে ইগনোর করুন

    // নতুন ঘরে গ্রহটিকে যোগ করা
    if (!nextHouseChart[targetHouseIdx].planets.includes(planetName)) {
      const added = [...nextHouseChart[targetHouseIdx].planets, planetName];
      nextHouseChart[targetHouseIdx] = { ...nextHouseChart[targetHouseIdx], planets: added, planets_text: added.join("\n") };
    }

    // গ্রহের নাম অনুযায়ী ব্যাকএন্ডের জন্য Shorthand এবং Overrides আপডেট করা
    const ABBR_TO_FULL: Record<string, string> = {
      "র": "Sun", "রবি": "Sun", "চ": "Moon", "চন্দ্র": "Moon",
      "ম": "Mars", "মঙ্গল": "Mars", "বু": "Mercury", "বুধ": "Mercury",
      "বৃ": "Jupiter", "বৃহস্পতি": "Jupiter", "শু": "Venus", "শুক্র": "Venus",
      "শ": "Saturn", "শনি": "Saturn", "রা": "Rahu", "রাহু": "Rahu",
      "কে": "Ketu", "কেতু": "Ketu"
    };

    const fullPlanetName = ABBR_TO_FULL[planetName] || planetName;
    const newOverrideLon = (targetSignIdx * 30) + 15.0;

    // ফর্ম ইনপুট স্টেটে overrides ডিকশনারি পুশ করে দিন (Drag & Drop Sync)
    setFormValue((prev) => ({
      ...prev,
      planet_overrides: {
        ...(prev.planet_overrides || {}),
        [fullPlanetName]: newOverrideLon,
      },
    }));

    const nextShorthands = [...reportState.shorthand_planets];
    const matchedIdx = nextShorthands.findIndex(p => p.full === fullPlanetName || p.short === planetName);

    if (matchedIdx >= 0) {
      // নতুন ঘরের কেন্দ্র বরাবর (১৫ ডিগ্রী) পরম মান সেট করা হলো
      const newCompact = `${toLocalDigits(String(targetSignIdx), reportState.lang)} | ১৫° ০০′ ০০″`;
      nextShorthands[matchedIdx] = {
        ...nextShorthands[matchedIdx],
        compact_indexed: newCompact
      };
    }

    const nextNudges = {
      ...(reportState.planet_nudges || {}),
      [planetName]: { dx: 0, dy: 0 }
    };

    setReportState({
      ...reportState,
      house_chart: nextHouseChart,
      shorthand_planets: nextShorthands,
      planet_overrides: {
        ...(reportState.planet_overrides || {}),
        [fullPlanetName]: newOverrideLon
      },
      planet_nudges: nextNudges
    });
    setSelectedPlanet("");
  };

  const handleClickDropPlanet = (targetSignIdx: number) => {
    if (!selectedPlanet || !reportState) {
      setSelectedPlanet("");
      return;
    }

    const planetName = selectedPlanet;
    setSelectedPlanet("");

    const nextHouseChart = [...reportState.house_chart];
    let planetMoved = false;

    nextHouseChart.forEach((house, i) => {
      if (house.planets.includes(planetName)) {
        const filtered = house.planets.filter(p => p !== planetName);
        nextHouseChart[i] = { ...house, planets: filtered, planets_text: filtered.join("\n") };
        planetMoved = true;
      }
    });

    if (!planetMoved) return;

    if (!nextHouseChart[targetSignIdx].planets.includes(planetName)) {
      const added = [...nextHouseChart[targetSignIdx].planets, planetName];
      nextHouseChart[targetSignIdx] = { ...nextHouseChart[targetSignIdx], planets: added, planets_text: added.join("\n") };
    }

    const ABBR_TO_FULL: Record<string, string> = {
      "র": "Sun", "রবি": "Sun", "চ": "Moon", "চন্দ্র": "Moon",
      "ম": "Mars", "মঙ্গল": "Mars", "বু": "Mercury", "বুধ": "Mercury",
      "বৃ": "Jupiter", "বৃহস্পতি": "Jupiter", "শু": "Venus", "শুক্র": "Venus",
      "শ": "Saturn", "শনি": "Saturn", "রা": "Rahu", "রাহু": "Rahu",
      "কে": "Ketu", "কেতু": "Ketu"
    };

    const fullPlanetName = ABBR_TO_FULL[planetName] || planetName;
    const newOverrideLon = (targetSignIdx * 30) + 15.0;

    setFormValue((prev) => ({
      ...prev,
      planet_overrides: {
        ...(prev.planet_overrides || {}),
        [fullPlanetName]: newOverrideLon,
      },
    }));

    const nextShorthands = [...reportState.shorthand_planets];
    const matchedIdx = nextShorthands.findIndex(p => p.full === fullPlanetName || p.short === planetName);

    if (matchedIdx >= 0) {
      const newCompact = `${toLocalDigits(String(targetSignIdx), reportState.lang)} | ১৫° ০০′ ০০″`;
      nextShorthands[matchedIdx] = {
        ...nextShorthands[matchedIdx],
        compact_indexed: newCompact
      };
    }

    const nextNudges = {
      ...(reportState.planet_nudges || {}),
      [planetName]: { dx: 0, dy: 0 }
    };

    setReportState({
      ...reportState,
      house_chart: nextHouseChart,
      shorthand_planets: nextShorthands,
      planet_overrides: {
        ...(reportState.planet_overrides || {}),
        [fullPlanetName]: newOverrideLon
      },
      planet_nudges: nextNudges
    });
  };

  /* ═══════════════════════════════════════════════════════════════════
     JSX — Premium "Astro Freelance Workspace" UI
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif", background: "#f7f5f0", color: "#334155" }}>

      {/* ── Background Decorative Mandalas ── */}
      <div className="absolute top-0 left-0 w-[30vw] h-[30vw] min-w-[15rem] min-h-[15rem] bg-amber-100 opacity-20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[30vw] h-[30vw] min-w-[15rem] min-h-[15rem] bg-red-100 opacity-20 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* ── Header / Branding ── */}
      <header className="fixed top-0 left-0 right-0 no-print w-full py-3 px-3 sm:px-6 border-b flex items-center justify-between shadow-sm z-30 h-[65px]" style={{ borderColor: "#ebdcb9", background: "#fdfcf7" }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-amber-100/80 transition-colors border shadow-sm"
            style={{ color: "#92400e", borderColor: "rgba(245, 158, 11, 0.25)", background: "#fffbeb" }}
            title="Go Back"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
          </button>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md" style={{ background: "#92400e" }}>
            🕉️
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight" style={{ color: "#1a365d" }}>Astro Workspace</h1>
            <p className="hidden sm:block text-xs font-medium" style={{ color: "rgba(146, 64, 14, 0.8)" }}>Sagar Ghosh&apos;s Digital Astrology Board</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
            style={{ color: "#2563eb", background: "#eff6ff", borderColor: "#bfdbfe" }}
            id="workspace-reload-btn"
            title="Reload Page"
          >
            <i className="fa-solid fa-arrows-rotate"></i> Reload
          </button>
          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
            style={{ color: "#b45309", background: "#fffbeb", borderColor: "#fde68a" }}
            id="workspace-about-btn"
          >
            <i className="fa-solid fa-circle-info"></i> About
          </button>
          {/* Admin Button — only visible for admin role */}
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
              style={{ color: "#92400e", background: "#fffbeb", borderColor: "#f59e0b40" }}
              id="workspace-admin-btn"
            >
              <i className="fa-solid fa-shield-halved"></i> Admin
            </Link>
          )}
          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
            style={{ color: "#ef4444", background: "#fef2f2", borderColor: "#fecaca" }}
            id="workspace-logout-btn"
          >
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
          {reportState && (
            <Link
              href="/?new=true"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
              style={{ color: "#475569", background: "#f8fafc", borderColor: "#cbd5e1" }}
              id="new-report-btn"
            >
              <i className="fa-solid fa-plus"></i> New Report
            </Link>
          )}
          {reportState && (
            <button
              type="button"
              onClick={() => setShowBirthDetails(!showBirthDetails)}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border"
              style={{ color: "#475569", background: "#fffbeb", borderColor: "#ebdcb9" }}
              id="edit-details-btn"
            >
              <i className="fa-solid fa-user-pen"></i> Edit Birth Details
            </button>
          )}
          {reportState && (
            <button
              onClick={() => showBirthDetails ? handleLoadDetails(formValue) : triggerPdfUpdate(reportState)}
              disabled={rendering || loading}
              id="btn-update-pdf"
              className="hidden md:flex items-center gap-1.5 text-[0.6875rem] sm:text-xs font-semibold px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg shadow-sm transition-all disabled:opacity-60 text-white"
              style={{ background: "linear-gradient(135deg, #800020, #590219)" }}
            >
              {(rendering || loading) && <LoadingSpinner />}
              <span className="hidden sm:inline">{loading ? "Calculating..." : rendering ? "Updating..." : showBirthDetails ? "Recalculate & Refresh" : "Update & Refresh Preview"}</span>
              <span className="inline sm:hidden">{loading ? "Calculating..." : rendering ? "Updating..." : showBirthDetails ? "Recalculate" : "Update"}</span>
            </button>
          )}

          {/* Mobile Actions 3-Dot Dropdown Menu */}
          {reportState && (
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-lg border text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
                style={{ borderColor: "#ebdcb9" }}
                aria-label="Actions menu"
                aria-expanded={isMobileMenuOpen}
              >
                <i className="fa-solid fa-ellipsis-vertical text-base"></i>
              </button>

              {isMobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl border bg-white shadow-xl z-50 p-1.5 flex flex-col gap-1"
                    style={{ borderColor: "#ebdcb9" }}
                  >
                    <Link
                      href="/?new=true"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                      style={{ color: "#475569" }}
                    >
                      <i className="fa-solid fa-plus w-4 text-center text-slate-400"></i> New Report
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAboutOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors w-full text-left"
                      style={{ color: "#475569" }}
                    >
                      <i className="fa-solid fa-circle-info w-4 text-center text-slate-400"></i> About
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBirthDetails(!showBirthDetails);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors w-full text-left"
                      style={{ color: "#475569" }}
                    >
                      <i className="fa-solid fa-user-pen w-4 text-center text-slate-400"></i> Edit Birth Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showBirthDetails ? handleLoadDetails(formValue) : triggerPdfUpdate(reportState);
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={rendering || loading}
                      className="flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-red-50/50 active:bg-red-50 transition-colors w-full text-left border-t border-slate-100 mt-1 pt-2"
                      style={{ color: "#800020" }}
                    >
                      {rendering ? (
                        <div className="w-4 flex justify-center"><LoadingSpinner /></div>
                      ) : (
                        <i className="fa-solid fa-arrows-rotate w-4 text-center text-[#800020]/75"></i>
                      )}
                      <span>Update &amp; Refresh</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[65px] shrink-0 no-print" />

      {/* ── Error Banner ── */}
      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm flex items-center gap-2 z-20">
          <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* ── MAIN INTERACTIVE FLOW ── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 items-stretch overflow-y-auto lg:overflow-hidden h-auto lg:h-[calc(100vh-65px)]">
        {/* ── LEFT COLUMN: Interactive Visual Editor ── */}
        <section className="lg:col-span-5 flex flex-col overflow-y-auto border-r border-[#ebdcb9]" style={{ background: "white" }}>

          {/* Editor Header */}
          <div className="p-4 flex items-center justify-between no-print border-b" style={{ background: "rgba(255, 251, 235, 0.6)", borderColor: "#ebdcb9" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider" style={{ background: "rgba(128, 0, 32, 0.1)", color: "#800020" }}>
                Visual Editor Sheet
              </span>
            </div>
            {/* Collapsible birth details toggle in editor */}
            {reportState && (
              <button
                type="button"
                onClick={() => setShowBirthDetails(!showBirthDetails)}
                className="text-xs font-medium flex items-center gap-1 transition-colors"
                style={{ color: "#64748b" }}
              >
                <i className="fa-solid fa-keyboard"></i> {showBirthDetails ? "Hide Form" : "Edit Details"}
              </button>
            )}
          </div>

          {/* Birth details inside editor */}
          {showBirthDetails && (
            <div className="p-4 border-b" style={{ background: "#fdfcf9", borderColor: "#ebdcb9" }}>
              {!reportState && (
                /* Bengali Title Header */
                <div className="text-center mb-6 relative">
                  <span className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "#92400e" }}>কোষ্ঠী ও জীবন জিজ্ঞাসা</span>
                  <h2 className="text-3xl font-extrabold mb-2 tracking-wide bengali-serif" style={{ color: "#800020" }}>জন্ম বিবরণী</h2>
                  <div className="flex justify-center items-center gap-2" style={{ color: "#d97706" }}>
                    <span className="h-[1px] w-12" style={{ background: "#ebdcb9" }}></span>
                    <i className="fa-solid fa-om text-md"></i>
                    <span className="h-[1px] w-12" style={{ background: "#ebdcb9" }}></span>
                  </div>
                </div>
              )}
              <ReportForm value={formValue} onChange={setFormValue} onSubmit={handleLoadDetails} loading={loading} />
              {!reportState && (
                <p className="text-center mt-4 text-[0.625rem]" style={{ color: "rgba(120, 53, 15, 0.6)" }}>
                  Inspired by traditional Bengali palmistry &amp; astrology charts
                </p>
              )}
            </div>
          )}

          {reportState && (
            <div className="p-4 space-y-5">

              {/* Bengali Date Override (Manual override) */}
              {showBirthDetails && (
                <div className="rounded-xl p-4 shadow-sm" style={{ background: "#fdfcf9", border: "1px solid #ebdcb9" }}>
                  <h3 className="text-sm font-bold mb-3 pb-2 flex items-center gap-2" style={{ color: "#1a365d", borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                    <i className="fa-solid fa-calendar-days" style={{ color: "#92400e" }}></i> Bengali Date Override / বাংলা তারিখ পরিবর্তন
                  </h3>
                  <div className="flex flex-col gap-1.5 text-[0.6875rem]">
                    <span className="font-semibold text-slate-500">Bengali Date Picker / বাংলা তারিখ পরিবর্তন করুন</span>
                    <BengaliDatePicker
                      value={reportState.customer.bengali_dob}
                      lang={reportState.lang}
                      onChange={(val: string) => updateCustomerField("bengali_dob", val)}
                    />
                  </div>
                </div>
              )}

              {/* ── SECTIONS B & C: Planet Positions & Kundli Summary (Side-by-Side) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── SECTION B: Planet Positions ── */}
                <div className="rounded-xl p-4 shadow-sm" style={{ background: "#fcfcf9", border: "1px solid #ebdcb9" }}>
                  <h3 className="text-sm font-bold mb-3 pb-2 flex items-center gap-2" style={{ color: "#1a365d", borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                    <i className="fa-solid fa-sliders" style={{ color: "#92400e" }}></i> Planet Positions (গ্রহাবস্থান)
                  </h3>
                  <div className="grid gap-2">
                    {sortedShorthandPlanets.map((pl) => (
                      <div key={pl.full} className="grid grid-cols-[5rem_1fr_auto] gap-2 items-center">
                        <span className="font-bold text-slate-700 text-right pr-1 whitespace-nowrap text-[0.6875rem]" title={pl.full}>
                          {pl.full === "Sun" ? "রবি" :
                            pl.full === "Moon" ? "চন্দ্র" :
                              pl.full === "Mars" ? "মঙ্গল" :
                                pl.full === "Mercury" ? "বুধ" :
                                  pl.full === "Jupiter" ? "বৃহস্পতি" :
                                    pl.full === "Venus" ? "শুক্র" :
                                      pl.full === "Saturn" ? "শনি" :
                                        pl.full === "Rahu" ? "রাহু" : "কেতু"} :
                        </span>
                        <input
                          className="px-2 py-1 rounded w-full font-bold tracking-wide shadow-sm focus:bg-white focus:outline-none focus:border-indigo-500 text-[0.6875rem]"
                          style={{ border: "1px solid #fcd34d", background: "rgba(255, 251, 235, 0.7)", color: "#1e1b4b" }}
                          value={toEnglishDigits(pl.compact_indexed ?? pl.compact ?? "")}
                          onChange={(e) => updateShorthandPlanet(pl.full, "compact_indexed", e.target.value)}
                        />
                        <div className="flex gap-0.5 pl-1 shrink-0 w-fit">
                          {pl.is_retrograde && <span title="Retrograde" className="select-none text-amber-600 font-bold text-[0.625rem]">(R)</span>}
                          {pl.is_combust && <span title="Combust" className="select-none text-red-500 font-bold text-[0.625rem]">(C)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── SECTION C: Summary & Lucky Info ── */}
                <div className="rounded-xl p-4 shadow-sm" style={{ background: "#fcfcf9", border: "1px solid #ebdcb9" }}>
                  <div className="flex items-center justify-between pb-2 mb-3" style={{ borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#1a365d" }}>
                      <i className="fa-solid fa-star-half-stroke" style={{ color: "#92400e" }}></i> Kundli Summary
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800 text-[0.5625rem]">
                      <input type="checkbox" checked={!!reportState.show_lucky_info} onChange={(e) => updateToggle("show_lucky_info", e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" style={{ borderColor: "#cbd5e1" }} />
                      <span>Show Lucky</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Rashi", field: "rashi" as const, options: ZODIAC_SIGNS_MAP },
                      { label: "Lagna", field: "lagna" as const, options: ZODIAC_SIGNS_MAP },
                      { label: "Nakshatra", field: "nakshatra" as const, options: NAKSHATRAS_MAP },
                      { label: "Pada", field: "pada" as const, options: PADAS_MAP },
                      { label: "Gan", field: "gan" as const, options: GANAS_MAP },
                      { label: "Varna", field: "varna" as const, options: VARNAS_MAP },
                    ].map(({ label, field, options }) => {
                      const currentLang = reportState.lang || "bn";
                      const baseOpts = options[currentLang] || options.bn;
                      const currentValue = (reportState.summary as any)[field] || "";
                      const finalOpts = baseOpts.includes(currentValue) || !currentValue
                        ? baseOpts
                        : [currentValue, ...baseOpts];

                      return (
                        <div key={field} className="flex items-center gap-1 text-[0.625rem]">
                          <span className="font-semibold text-slate-500 shrink-0">{label}:</span>
                          <select
                            className="rounded px-1 py-0.5 w-full focus:bg-white focus:outline-none text-[0.6875rem] cursor-pointer font-semibold border border-slate-200"
                            style={{ background: "rgba(248, 250, 252, 0.5)" }}
                            value={currentValue}
                            onChange={(e) => {
                              updateSummaryField(field, e.target.value);
                              if (field === "pada") updateSummaryField("nakshatra_pada", e.target.value);
                            }}
                          >
                            <option value="">Select...</option>
                            {finalOpts.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {/* Lucky Info */}
                  <div className={`mt-3 p-2 rounded grid gap-2 transition-opacity ${!reportState.show_lucky_info ? "opacity-30 pointer-events-none" : ""}`} style={{ border: "1px solid #fef3c7", background: "rgba(255, 251, 235, 0.4)" }}>
                    {[
                      { label: "Lucky Day", field: "shubh_bar" as const, options: WEEKDAYS_MAP },
                      { label: "Lucky Color", field: "shubh_rong" as const, options: COLORS_MAP },
                      { label: "Lucky Number", field: "shubh_sonkha" as const, options: NUMBERS_MAP },
                      { label: "Lucky Name Letter", field: "namer_adokkhyor" as const, options: NAME_LETTERS_MAP },
                    ].map(({ label, field, options }) => {
                      const currentLang = reportState.lang || "bn";
                      const baseOpts = options[currentLang] || options.bn;
                      const currentValue = (reportState.summary as any)[field] || "";

                      return (
                        <MultiSelectDropdown
                          key={field}
                          label={label}
                          options={baseOpts}
                          value={currentValue}
                          onChange={(val) => {
                            updateSummaryField(field, val);
                            if (field === "namer_adokkhyor") {
                              updateSummaryField("current_pada_syllable", val);
                            }
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex flex-col text-[0.59375rem] gap-0.5">
                      <span className="font-semibold text-slate-500">Nakshatra Lord</span>
                      {(() => {
                        const currentLang = reportState.lang || "bn";
                        const baseOpts = NAKSHATRA_LORDS_MAP[currentLang] || NAKSHATRA_LORDS_MAP.bn;
                        const currentValue = reportState.summary.nakshatra_lord || "";
                        const finalOpts = baseOpts.includes(currentValue) || !currentValue
                          ? baseOpts
                          : [currentValue, ...baseOpts];

                        return (
                          <select
                            className="rounded px-1 py-0.5 w-full focus:bg-white focus:outline-none text-[0.6875rem] cursor-pointer font-semibold border border-slate-200"
                            style={{ background: "rgba(248, 250, 252, 0.5)" }}
                            value={currentValue}
                            onChange={(e) => updateSummaryField("nakshatra_lord", e.target.value)}
                          >
                            <option value="">Select...</option>
                            {finalOpts.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-col mt-2 text-[0.59375rem]">
                    <span className="font-semibold text-slate-500">Dasha Balance</span>
                    <input
                      className="rounded px-1 py-0.5 w-full font-bold focus:bg-white focus:outline-none text-[0.6875rem]"
                      style={{ border: "1px solid #e2e8f0", background: "rgba(248, 250, 252, 0.5)" }}
                      value={toEnglishDigits(reportState.summary.dasha_balance)}
                      onChange={(e) => updateSummaryField("dasha_balance", e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col mt-3 pt-3 border-t border-slate-200 text-[0.59375rem] gap-1.5">
                    {(() => {
                      const currentLang = reportState.lang || "bn";
                      const labelText = currentLang === "bn" ? "দোষ / দশা যোগ (Astrological Conditions)" : (currentLang === "hi" ? "ज्योतिषीय दोष / दशा" : "Astrological Conditions (Doshas/Dashas)");
                      const selectPlaceholder = currentLang === "bn" ? "নির্বাচন করুন..." : (currentLang === "hi" ? "विकल्प चुनें..." : "Select option...");
                      const addLabel = currentLang === "bn" ? "যোগ করুন" : (currentLang === "hi" ? "जोड़ें" : "Add");

                      return (
                        <>
                          <span className="font-semibold text-slate-500">{labelText}</span>
                          <div className="flex gap-1.5">
                            <select
                              className="rounded px-1 py-0.5 w-full focus:bg-white focus:outline-none text-[0.6875rem] cursor-pointer font-semibold border border-slate-200"
                              style={{ background: "rgba(248, 250, 252, 0.5)" }}
                              value={selectedDoshaInput}
                              onChange={(e) => setSelectedDoshaInput(e.target.value)}
                            >
                              <option value="">{selectPlaceholder}</option>
                              <option value="মাঙ্গলিক">{DOSHA_TRANSLATIONS[currentLang]?.["মাঙ্গলিক"] || "মাঙ্গলিক"}</option>
                              <option value="আংশিক মাঙ্গলিক">{DOSHA_TRANSLATIONS[currentLang]?.["আংশিক মাঙ্গলিক"] || "আংশিক মাঙ্গলিক"}</option>
                              <option value="কালসর্প দোষ">{DOSHA_TRANSLATIONS[currentLang]?.["কালসর্প দোষ"] || "কালসর্প দোষ"}</option>
                              <option value="আংশিক কালসর্প দোষ">{DOSHA_TRANSLATIONS[currentLang]?.["আংশিক কালসর্প দোষ"] || "আংশিক কালসর্প দোষ"}</option>
                              <option value="সাড়েসাতি">{DOSHA_TRANSLATIONS[currentLang]?.["সাড়েসাতি"] || "সাড়েসাতি"}</option>
                              <option value="ধাইয়া">{DOSHA_TRANSLATIONS[currentLang]?.["ধাইয়া"] || "ধাইয়া"}</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedDoshaInput || !reportState) return;
                                const currentDoshas = reportState.summary.selected_doshas || [];
                                const translatedInput = DOSHA_TRANSLATIONS[currentLang]?.[selectedDoshaInput] || selectedDoshaInput;
                                if (currentDoshas.includes(translatedInput)) return;
                                const nextDoshas = [...currentDoshas, translatedInput];
                                const updatedState = {
                                  ...reportState,
                                  summary: {
                                    ...reportState.summary,
                                    selected_doshas: nextDoshas
                                  }
                                };
                                setReportState(updatedState);
                                triggerPdfUpdate(updatedState);
                                setSelectedDoshaInput("");
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.6875rem] font-bold rounded shadow-sm transition-all shrink-0"
                            >
                              {addLabel}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(reportState.summary.selected_doshas || []).map((dosha: string, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[0.625rem] font-medium leading-none">
                          {dosha}
                          <button
                            type="button"
                            onClick={() => {
                              const nextDoshas = (reportState.summary.selected_doshas || []).filter((d: string) => d !== dosha);
                              const updatedState = {
                                ...reportState,
                                summary: {
                                  ...reportState.summary,
                                  selected_doshas: nextDoshas
                                }
                              };
                              setReportState(updatedState);
                              triggerPdfUpdate(updatedState);
                            }}
                            className="text-red-500 hover:text-red-700 font-bold ml-0.5 text-[0.6875rem]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION A: Rashi Chakra ── */}
              <div className="rounded-xl p-4 shadow-sm" style={{ background: "#fcfcf9", border: "1px solid #ebdcb9" }}>
                <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#1a365d" }}>
                    <i className="fa-solid fa-bahai animate-spin-slow" style={{ color: "#92400e" }}></i> Interactive Rashi Chakra
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800 text-[0.5625rem]">
                      <input
                        type="checkbox"
                        checked={!!reportState.show_kundli}
                        onChange={(e) => updateToggle("show_kundli", e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                        style={{ borderColor: "#cbd5e1" }}
                      />
                      <span>Show PDF</span>
                    </label>
                    <span className="text-[0.6875rem] px-2 py-0.5 rounded font-medium" style={{ background: "#fef3c7", color: "#78350f" }}>
                      Click / Drag Planets
                    </span>
                  </div>
                </div>

                {selectedPlanet && (
                  <div className="flex items-center justify-center gap-2 rounded px-2 py-1 text-amber-800 font-semibold mb-2 text-[0.625rem]" style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
                    <span>Selected: <strong className="text-amber-600">{selectedPlanet}</strong> — click house to move or use arrow keys to nudge</span>
                    <button
                      onClick={() => setSelectedPlanet("")}
                      className="text-amber-500 hover:text-amber-700 font-bold text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Rashi Chakra SVG — 100% IDENTICAL LOGIC */}
                <div className={`transition-opacity duration-200 ${!reportState.show_kundli ? "opacity-30" : ""}`} style={{ padding: 0, margin: 0 }}>
                  <svg viewBox="0 0 300 300" className="w-full max-w-[17rem] aspect-square stroke-slate-700 mx-auto" style={{ background: "transparent", overflow: "visible" }}>
                    {/* Grid Lines */}
                    <line x1="100" y1="0" x2="100" y2="300" stroke="#c084fc" strokeWidth="2" />
                    <line x1="200" y1="0" x2="200" y2="300" stroke="#c084fc" strokeWidth="2" />
                    <line x1="0" y1="100" x2="300" y2="100" stroke="#c084fc" strokeWidth="2" />
                    <line x1="0" y1="200" x2="300" y2="200" stroke="#c084fc" strokeWidth="2" />

                    {/* Diagonals */}
                    <line x1="0" y1="0" x2="100" y2="100" stroke="#c084fc" strokeWidth="2" />
                    <line x1="300" y1="0" x2="200" y2="100" stroke="#c084fc" strokeWidth="2" />
                    <line x1="0" y1="300" x2="100" y2="200" stroke="#c084fc" strokeWidth="2" />
                    <line x1="300" y1="300" x2="200" y2="200" stroke="#c084fc" strokeWidth="2" />

                    <text x="150" y="156" textAnchor="middle" stroke="none" className="text-[0.75rem] font-black fill-purple-900 tracking-wider select-none">
                      রাশি চক্র
                    </text>

                    {(() => {
                      const houseLayout = [
                        { numX: 150, numY: -10, planetsX: 150, planetsY: 34, poly: "100,100 200,100 150,0", signIdx: 0 },
                        { numX: 72, numY: -10, planetsX: 95, planetsY: 12, poly: "0,0 100,0 100,100", signIdx: 1 },
                        { numX: -12, numY: 68, planetsX: 12, planetsY: 95, poly: "0,0 0,100 100,100", signIdx: 2 },
                        { numX: -12, numY: 140, planetsX: 34, planetsY: 140, poly: "100,100 100,200 0,150", signIdx: 3 },
                        { numX: -12, numY: 212, planetsX: 12, planetsY: 205, poly: "0,200 0,300 100,200", signIdx: 4 },
                        { numX: 72, numY: 320, planetsX: 95, planetsY: 288, poly: "100,200 100,300 0,300", signIdx: 5 },
                        { numX: 150, numY: 320, planetsX: 150, planetsY: 266, poly: "100,200 200,200 150,300", signIdx: 6 },
                        { numX: 228, numY: 320, planetsX: 205, planetsY: 288, poly: "200,200 200,300 300,300", signIdx: 7 },
                        { numX: 312, numY: 212, planetsX: 288, planetsY: 205, poly: "200,200 300,200 300,300", signIdx: 8 },
                        { numX: 312, numY: 140, planetsX: 266, planetsY: 140, poly: "200,100 200,200 300,150", signIdx: 9 },
                        { numX: 312, numY: 68, planetsX: 288, planetsY: 95, poly: "300,0 200,100 300,100", signIdx: 10 },
                        { numX: 228, numY: -10, planetsX: 205, planetsY: 12, poly: "200,0 300,0 200,100", signIdx: 11 }
                      ];

                      const lagnaIdx = reportState.summary.lagna_sign_index ?? 0;
                      const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯", "১০", "১১", "১২"];
                      const finalCoords = reportState ? calculatePlanetCoords(reportState) : {};

                      return houseLayout.map((layout) => {
                        const rawHouseNumber = ((layout.signIdx - lagnaIdx + 12) % 12) + 1;
                        const currentHouseBn = banglaDigits[rawHouseNumber];
                        const house = reportState.house_chart[layout.signIdx];
                        const isDropTarget = !!selectedPlanet;

                        return (
                          <g
                            key={layout.signIdx}
                            onClick={() => {
                              if (selectedPlanet) {
                                handleClickDropPlanet(layout.signIdx);
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropPlanet(e, layout.signIdx)}
                            className="cursor-pointer"
                          >
                            <polygon
                              points={layout.poly}
                              fill={isDropTarget ? "rgba(99,102,241,0.08)" : "transparent"}
                              stroke={isDropTarget ? "#818cf8" : "transparent"}
                              strokeWidth={isDropTarget ? "1" : "0"}
                              pointerEvents="all"
                              className="transition-all duration-150"
                            />

                            <text x={layout.numX} y={layout.numY} textAnchor="middle" fill="#9333ea" stroke="none" className="text-[0.8125rem] font-extrabold select-none pointer-events-none">
                              {currentHouseBn}
                            </text>
                            {(() => {
                              const isLagnaHouse = layout.signIdx === lagnaIdx;
                              const lagnaCoords = isLagnaHouse ? finalCoords["ল"] : null;
                              const items = house?.planets || [];
                              const isDense = items.length >= 4;
                              const textSize = isDense ? "text-[0.6875rem]" : "text-[0.84375rem]";

                              const elements = [];

                              // Render Lagna First, independently
                              if (lagnaCoords) {
                                const isSelected = selectedPlanet === "ল";
                                elements.push(
                                  <text
                                    key="lagna"
                                    x={lagnaCoords.x}
                                    y={lagnaCoords.y}
                                    textAnchor="middle"
                                    stroke="none"
                                    className={`${textSize} font-bold cursor-pointer select-none transition-all ${isSelected ? "fill-amber-500 text-[1.0625rem] animate-pulse" : "fill-red-600 hover:fill-red-500"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPlanet(isSelected ? "" : "ল");
                                    }}
                                  >
                                    লং
                                  </text>
                                );
                              }

                              // Render Planets Afterwards
                              items.forEach((itemName, idx) => {
                                const coords = finalCoords[itemName];
                                if (!coords) return;
                                const isSelected = selectedPlanet === itemName;

                                elements.push(
                                  <text
                                    key={`planet-${idx}`}
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    stroke="none"
                                    className={`${textSize} font-extrabold tracking-[-0.5px] cursor-pointer select-none transition-all ${isSelected ? "fill-amber-500 text-[1.0625rem] animate-pulse" : "fill-indigo-950 hover:fill-indigo-950/80"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPlanet(isSelected ? "" : itemName);
                                    }}
                                    {...({ draggable: true } as any)}
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData("text/plain", itemName);
                                      setSelectedPlanet(itemName);
                                    }}
                                  >
                                    {itemName}
                                  </text>
                                );
                              });

                              return elements;
                            })()}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Nudge Controls */}
                {selectedPlanet && (
                  <div className="mt-2 p-2 rounded-lg flex flex-col items-center gap-1 select-none" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <span className="text-slate-500 uppercase tracking-wider text-[0.625rem] font-bold">
                      Nudge Controls
                    </span>
                    <div className="grid grid-cols-3 gap-1 w-[5rem] h-[5rem] items-center justify-center">
                      <div />
                      <button type="button" onClick={() => nudgeSelectedPlanet(0, -2)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors" title="Nudge Up">▲</button>
                      <div />
                      <button type="button" onClick={() => nudgeSelectedPlanet(-2, 0)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors" title="Nudge Left">◀</button>
                      <button type="button"
                        onClick={() => {
                          setReportState(prev => {
                            if (!prev) return prev;
                            const nudges = prev.planet_nudges || {};
                            return { ...prev, planet_nudges: { ...nudges, [selectedPlanet]: { dx: 0, dy: 0 } } };
                          });
                        }}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold p-1 rounded border border-amber-200 flex items-center justify-center h-6 w-6 transition-colors text-[0.625rem]" title="Reset Offset">⟲</button>
                      <button type="button" onClick={() => nudgeSelectedPlanet(2, 0)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors" title="Nudge Right">▶</button>
                      <div />
                      <button type="button" onClick={() => nudgeSelectedPlanet(0, 2)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors" title="Nudge Down">▼</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION D: Vimshottari Dasha & Antardasha ── */}
              <div className="grid grid-cols-1 md:grid-cols-[53%_47%] gap-4">

                {/* Mahadasha Table */}
                <div className={`rounded-xl p-3 shadow-sm transition-opacity duration-200 ${!reportState.show_mahadasha ? "opacity-30" : ""}`} style={{ background: "#fcfcf9", border: "1px solid #ebdcb9" }}>
                  <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                    <span className="font-bold text-slate-800 text-[0.6875rem]">
                      <i className="fa-solid fa-calendar-alt mr-1" style={{ color: "#92400e" }}></i> Vimshottari Dasha
                    </span>
                    <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800 text-[0.5625rem]">
                      <input type="checkbox" checked={!!reportState.show_mahadasha} onChange={(e) => updateToggle("show_mahadasha", e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" style={{ borderColor: "#cbd5e1" }} />
                      <span>Show PDF</span>
                    </label>
                  </div>
                  <div className="overflow-x-auto select-none">
                    <table className="min-w-full text-left text-[0.625rem]">
                      <thead>
                        <tr className="font-bold border-b" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                          <th className="px-1 py-0.5 text-center w-5">Active</th>
                          <th className="px-1 py-0.5">Dasha</th>
                          <th className="px-1 py-0.5 text-center">Yrs</th>
                          <th className="px-1 py-0.5">Start</th>
                          <th className="px-1 py-0.5">End</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportState.dasha_list.map((dasha, idx) => (
                          <tr
                            key={idx}
                            className={`cursor-pointer hover:bg-amber-50/40 transition-colors ${activePlanet === dasha.planet ? "font-bold text-slate-900" : "text-slate-700"}`}
                            style={activePlanet === dasha.planet ? { background: "rgba(255, 251, 235, 0.8)" } : {}}
                            onClick={() => {
                              setActivePlanet(dasha.planet);
                              setPopupMahadasha(dasha.planet);
                              setIsPopupOpen(true);
                            }}
                          >
                            <td className="px-1 py-1 text-center">
                              <input type="radio" name="activeDasha" checked={activePlanet === dasha.planet} onChange={() => setActivePlanet(dasha.planet)}
                                className="text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" />
                            </td>
                            <td className="px-1 py-1 font-semibold text-slate-800 text-[0.6875rem]">
                              {toEnglishDigits(dasha.planet_bn)}
                            </td>
                            <td className="px-1 py-1 text-center">
                              <input className="bg-transparent border-0 p-0 w-[2rem] text-center font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
                                value={toEnglishDigits(dasha.years)} onChange={(e) => updateDashaField(idx, "years", e.target.value)} onClick={(e) => e.stopPropagation()} />
                            </td>
                            <td className="px-1 py-1">
                              <input className="bg-transparent border-0 p-0 w-[4.4rem] focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
                                value={toEnglishDigits(dasha.start)} onChange={(e) => updateDashaField(idx, "start", e.target.value)} onClick={(e) => e.stopPropagation()} />
                            </td>
                            <td className="px-1 py-1">
                              <input className="bg-transparent border-0 p-0 w-[4.4rem] focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
                                value={toEnglishDigits(dasha.end)} onChange={(e) => updateDashaField(idx, "end", e.target.value)} onClick={(e) => e.stopPropagation()} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Antardasha Table */}
                <div className={`rounded-xl p-3 shadow-sm transition-opacity duration-200 ${!reportState.show_antardasha ? "opacity-30" : ""}`} style={{ background: "#fcfcf9", border: "1px solid #ebdcb9" }}>
                  <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                    <span className="font-bold text-slate-800 truncate text-[0.6875rem]">
                      Antardasha: {toEnglishDigits(reportState.dasha_list.find((d) => d.planet === activePlanet)?.planet_bn || activePlanet)}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800 text-[0.5625rem]">
                        <input type="checkbox" checked={!!reportState.show_antardasha} onChange={(e) => updateToggle("show_antardasha", e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" style={{ borderColor: "#cbd5e1" }} />
                        <span>Current (Pg 1)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800 text-[0.5625rem]" title="Show future antardashas on Page 2">
                        <input type="checkbox" checked={(reportState as any).show_future_antardashas !== false} onChange={(e) => updateToggle("show_future_antardashas", e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" style={{ borderColor: "#cbd5e1" }} />
                        <span>Future (Pg 2)</span>
                      </label>
                    </div>
                  </div>
                  <div className="overflow-x-auto select-none max-h-[240px] overflow-y-auto pr-0.5 scrollbar-thin">
                    <table className="min-w-full text-left text-[0.625rem]">
                      <thead>
                        <tr className="font-bold border-b" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                          <th className="px-1 py-0.5">Maha / Antar</th>
                          <th className="px-1 py-0.5">Start</th>
                          <th className="px-1 py-0.5">End</th>
                          <th className="px-1 py-0.5 text-center w-5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const displayRows = reportState.antardasha_display_rows ?? [];
                          if (!displayRows.length) {
                            return (
                              <tr>
                                <td colSpan={4} className="px-2 py-4 text-center text-slate-400 italic">
                                  No antardasha rows available. Click on a Mahadasha row above to add subperiods.
                                </td>
                              </tr>
                            );
                          }
                          return displayRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-amber-50/30 font-medium text-slate-700 animate-scale-up">
                              <td className="px-1 py-1 font-bold text-slate-850">
                                {toEnglishDigits(row.major_bn)} / {toEnglishDigits(row.lord_bn)}
                              </td>
                              <td className="px-1 py-1">
                                {toEnglishDigits(row.start || "")}
                              </td>
                              <td className="px-1 py-1">
                                {toEnglishDigits(row.end || "")}
                              </td>
                              <td className="px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeAntardashaRow(rowIdx)}
                                  className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                                  title="Remove Row"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── SECTION E: Remedies Ratings (18 Options) ── */}
              <div className="rounded-xl p-3 shadow-sm mt-4" style={{ background: "#fcfcf9", border: "1px solid #ebdcb9" }}>
                <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: "1px solid rgba(235, 220, 185, 0.6)" }}>
                  <span className="font-bold text-slate-800 text-[0.6875rem]">
                    <i className="fa-solid fa-gem mr-1" style={{ color: "#92400e" }}></i> Remedies Ratings (18 Options) - Auto Refreshes
                  </span>
                </div>
                {/* ── Table Headers for Visual Clarity ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2.5 pb-1 mb-1 border-b border-slate-200">
                  <span className="text-[0.6875rem] font-bold text-slate-600">গ্রহরত্ন (Gemstones)</span>
                  <span className="text-[0.6875rem] font-bold text-slate-600 hidden sm:block">শিকড় + ধাতু (Roots & Metals)</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {((reportState as any).remedies_list || []).map((remedy: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-white border border-slate-100 p-2.5 rounded shadow-sm items-center hover:border-amber-200 transition-colors">
                      {/* Gemstones Column */}
                      <div className="flex items-start justify-between gap-2 border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0 sm:pr-4">
                        <span className="text-[0.6875rem] text-slate-700 font-medium leading-snug">
                          <span className="font-bold">{remedy.id}।</span> {remedy.gemstone}
                        </span>
                        <div className="flex items-center gap-0.5 cursor-pointer shrink-0 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateRemedyRating(idx, "gemstone_rating", remedy.gemstone_rating === star ? 0 : star);
                              }}
                              className={`fa-solid fa-star text-[0.8rem] transition-all hover:scale-110 ${star <= (remedy.gemstone_rating || 0) ? "text-amber-400 drop-shadow-sm" : "text-slate-200"
                                }`}
                            ></i>
                          ))}
                        </div>
                      </div>
                      {/* Roots & Metals Column */}
                      <div className="flex items-start justify-between gap-2 sm:pl-1">
                        <span className="text-[0.6875rem] text-slate-700 font-medium leading-snug">
                          {remedy.remedy_root}
                        </span>
                        <div className="flex items-center gap-0.5 cursor-pointer shrink-0 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateRemedyRating(idx, "root_rating", remedy.root_rating === star ? 0 : star);
                              }}
                              className={`fa-solid fa-star text-[0.8rem] transition-all hover:scale-110 ${star <= (remedy.root_rating || 0) ? "text-amber-400 drop-shadow-sm" : "text-slate-200"
                                }`}
                            ></i>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-[0.6875rem] font-bold text-slate-500 italic">
                  ** ধাতু ও শ্বেতচন্দন পাল্টানোর প্রয়োজন নেই **
                </div>
              </div>

              {/* Bottom Update Button */}
              <div className="flex items-center justify-between gap-4 p-4 -mx-4 -mb-4 rounded-b-lg" style={{ background: "rgba(255, 251, 235, 0.6)", borderTop: "1px solid #ebdcb9" }}>
                <div className="text-slate-500 leading-normal max-w-[16.25rem] text-[0.6875rem]">
                  Modifications exist in local memory. Click update to compile PDF with current configurations.
                </div>
                <button
                  onClick={() => triggerPdfUpdate(reportState)}
                  disabled={rendering}
                  id="btn-update-pdf-bottom"
                  className="font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center gap-1.5 text-white btn-press"
                  style={{ background: "linear-gradient(135deg, #800020, #590219)" }}
                >
                  {rendering && <LoadingSpinner />}
                  {rendering ? "Updating PDF..." : "Update & Refresh Preview"}
                </button>
              </div>
            </div>
          )}
        </section>
        {/* ── RIGHT COLUMN: Live PDF Preview ── */}
        <section className="lg:col-span-7 flex flex-col items-center p-4 relative bg-[#f1f5f9] border-l border-[#e2e8f0] h-full overflow-y-auto">
          {/* Floating Controls Bar */}
          <div className="w-full max-w-5xl rounded-xl shadow-md p-3 mb-4 flex items-center justify-between z-10 sticky top-[65px] lg:top-0 no-print" style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(8px)", border: "1px solid #ebdcb9" }}>
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <i className="fa-solid fa-file-pdf" style={{ color: "#800020" }}></i> Live Report Preview
            </span>
            <div className="flex items-center gap-2">
              {fullPdfUrl && (
                <>
                  <div className="relative">
                    <select
                      className="rounded-lg pl-3 pr-7 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all appearance-none cursor-pointer outline-none border"
                      style={{ borderColor: "#cbd5e1" }}
                      value={pdfLanguage}
                      onChange={(e) => {
                        setPdfLanguage(e.target.value);
                      }}
                      id="select-language-preview"
                    >
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="en">English (English)</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>
                    <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400 text-[0.625rem]">
                      <i className="fa-solid fa-chevron-down"></i>
                    </span>
                  </div>
                  <a
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center gap-1"
                    style={{ border: "1px solid #cbd5e1" }}
                    href={fullPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    id="btn-open-pdf"
                  >
                    <i className="fa-solid fa-up-right-from-square text-[0.5625rem]"></i> Open
                  </a>
                  <button
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all text-white"
                    style={{ background: "#4f46e5" }}
                    onClick={(e) => {
                      e.preventDefault();
                      const iframe = document.querySelector("iframe");
                      if (iframe && iframe.contentWindow) {
                        const originalTitle = document.title;
                        document.title = "Print Astrological Report";
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => { document.title = originalTitle; }, 1000);
                      }
                    }}
                    id="btn-print-report"
                  >
                    <i className="fa-solid fa-print"></i> Print
                  </button>
                  <button
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all text-white btn-press"
                    style={{ background: "#800020" }}
                    onClick={async (e) => {
                      e.preventDefault();

                      const dobFormatted = formValue.dob
                        ? formValue.dob.split('-').reverse().join('.')
                        : "";
                      const filename = dobFormatted
                        ? `${formValue.name} (${dobFormatted}).pdf`
                        : `${formValue.name}.pdf`;

                      const reportId = reportState?.report_id;

                      // Helper to trigger the actual download
                      const triggerNativeDownload = () => {
                        const downloadUrl = `${API}/api/download-pdf/report_${reportId}.pdf?name=${encodeURIComponent(filename)}&token=${encodeURIComponent(token || "")}`;
                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.target = "_blank";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      };

                      // Fallback print helper
                      const triggerPrintFallback = () => {
                        const iframe = document.querySelector("iframe");
                        if (iframe && iframe.contentWindow) {
                          const originalTitle = document.title;
                          document.title = filename.replace(".pdf", "");
                          iframe.contentWindow.focus();
                          iframe.contentWindow.print();
                          setTimeout(() => { document.title = originalTitle; }, 1000);
                        }
                      };

                      if (!reportId) {
                        triggerPrintFallback();
                        return;
                      }

                      setRendering(true);
                      try {
                        // 1. Check current status
                        const statusData = await getPdfStatus(reportId);
                        if (statusData.status === "ready") {
                          triggerNativeDownload();
                          return;
                        }

                        // 2. If compiling or pending, open the progress modal and start polling
                        setCompilationStatus(statusData.status);
                        setCompilationProgress(statusData.progress || 0);
                        setDownloadModalOpen(true);

                        const pollInterval = setInterval(async () => {
                          try {
                            const pollData = await getPdfStatus(reportId);
                            setCompilationStatus(pollData.status);
                            setCompilationProgress(pollData.progress || 0);

                            if (pollData.status === "ready") {
                              clearInterval(pollInterval);
                              setDownloadModalOpen(false);
                              setPollIntervalId(null);
                              triggerNativeDownload();
                            } else if (pollData.status === "failed") {
                              clearInterval(pollInterval);
                              setDownloadModalOpen(false);
                              setPollIntervalId(null);
                              alert("PDF compilation failed on server. Falling back to print...");
                              triggerPrintFallback();
                            }
                          } catch (pollErr) {
                            console.error("Error polling PDF status:", pollErr);
                            clearInterval(pollInterval);
                            setDownloadModalOpen(false);
                            setPollIntervalId(null);
                          }
                        }, 2000);

                        setPollIntervalId(pollInterval);

                      } catch (err) {
                        console.error("Direct PDF download failed, falling back to iframe print", err);
                        triggerPrintFallback();
                      } finally {
                        setRendering(false);
                      }
                    }}
                    id="btn-download-pdf"
                  >
                    <i className="fa-solid fa-download"></i> Download PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="w-full max-w-5xl rounded-xl relative overflow-hidden bg-[#f1f5f9] border border-[#e2e8f0] flex-1">
            {(loading || rendering) && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-600 gap-3">
                <LoadingSpinner />
                <span className="text-xs font-medium tracking-wide">Compiling report preview...</span>
              </div>
            )}

            {fullPdfUrl ? (
              <PdfViewer pdfUrl={fullPdfUrl} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#f3e8ff" }}>
                  <i className="fa-solid fa-scroll text-2xl" style={{ color: "#9333ea" }}></i>
                </div>
                <span className="text-sm font-medium text-slate-500">No preview available</span>
                <span className="text-slate-400 max-w-[15rem] text-[0.6875rem]">
                  Initial calculations must be loaded first before the PDF compiles.
                </span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Modals ── */}
      {isPopupOpen && reportState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="w-full max-w-[480px] bg-[#fdfcf9] border-2 border-[#ebdcb9] rounded-2xl shadow-2xl p-5 relative flex flex-col animate-scale-up text-slate-800 max-h-[85vh] overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setIsPopupOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-650 transition-colors w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-sm font-bold text-sm"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Header */}
            <div className="text-center mb-4 pb-2.5 border-b border-[#ebdcb9]">
              <span className="text-[0.625rem] font-bold uppercase tracking-widest block mb-0.5 text-amber-800">
                Available Antardashas
              </span>
              <h3 className="text-xl font-extrabold text-[#800020] bengali-serif">
                {toEnglishDigits(
                  reportState.dasha_list.find((d) => d.planet === popupMahadasha)?.planet_bn || popupMahadasha
                )}{" "}
                মহাদশা
              </h3>
            </div>

            {/* List scroll container */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2 max-h-[50vh] min-h-[150px]">
              {(() => {
                const group = reportState.antardasha_list.find(
                  (g) => g.major_lord === popupMahadasha || g.major_bn === popupMahadasha
                );
                const subperiods = group ? group.subperiods : [];

                if (!subperiods.length) {
                  return (
                    <p className="text-center py-10 text-slate-400 italic text-xs">
                      No calculated subperiods found for this planet.
                    </p>
                  );
                }

                return subperiods.map((sub, idx) => {
                  const majorBn = group?.major_bn || popupMahadasha;
                  const isAlreadyAdded = reportState.antardasha_display_rows?.some(
                    (r) => r.major_bn === majorBn && r.lord_bn === sub.lord_bn
                  );

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-amber-200 transition-all"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-850 text-xs">
                          {toEnglishDigits(majorBn)} / {toEnglishDigits(sub.lord_bn)}
                        </span>
                        <span className="text-[0.625rem] font-semibold text-slate-500">
                          {toEnglishDigits(sub.start)} → {toEnglishDigits(sub.end)}
                        </span>
                      </div>

                      {isAlreadyAdded ? (
                        <span className="text-[0.5625rem] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-sm flex items-center gap-0.5 select-none">
                          ✓ Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            addSelectedAntardasha(majorBn, sub.lord_bn, sub.start, sub.end)
                          }
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[0.625rem] font-bold rounded-lg border border-indigo-200 transition-all shadow-sm"
                        >
                          [+] Add
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="w-full max-w-[400px] bg-[#fdfcf9] border-2 border-[#ebdcb9] rounded-2xl shadow-2xl p-6 relative flex flex-col items-center animate-scale-up text-slate-800">
            {/* Title / Header */}
            <div className="text-center w-full pb-3 border-b border-[#ebdcb9] mb-4">
              <span className="text-[0.625rem] font-bold uppercase tracking-widest block mb-0.5 text-amber-800">
                PDF Compilation
              </span>
              <h3 className="text-lg font-extrabold text-[#800020] bengali-serif">
                Preparing PDF...
              </h3>
            </div>

            {/* Spinner and Progress Loader */}
            <div className="w-full flex flex-col items-center py-4">
              <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                {/* Circular spinner track */}
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                {/* Spinning loader */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                {/* Percentage text */}
                <span className="text-xs font-bold text-slate-700">
                  {compilationProgress}%
                </span>
              </div>

              {/* Text Description */}
              <p className="text-xs font-semibold text-slate-500 mb-6 text-center">
                {compilationStatus === "pending"
                  ? "Queued in background..."
                  : "Rendering charts and fonts..."}
              </p>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner mb-4">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-500 ease-out"
                  style={{ width: `${compilationProgress}%` }}
                />
              </div>

              {/* Bengali Indicator */}
              <span className="text-[0.6875rem] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 text-center leading-relaxed">
                পিডিএফ ফাইল প্রস্তুত করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...
              </span>
            </div>

            {/* Close Button / Cancel */}
            <div className="w-full mt-2 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (pollIntervalId) {
                    clearInterval(pollIntervalId);
                    setPollIntervalId(null);
                  }
                  setDownloadModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  )
}