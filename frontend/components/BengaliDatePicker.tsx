"use client";

import { useMemo } from "react";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const HI_DIGITS = "०१२३४५६७८९";

function toEnglishDigits(text: string): string {
  if (!text) return "";
  let res = text.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));
  res = res.replace(/[०-९]/g, (digit) => String(HI_DIGITS.indexOf(digit)));
  return res;
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

export function parseBengaliDobString(dobStr: string, lang?: string): { day: number; monthIdx: number; year: number } {
  const defaultVal = { day: 1, monthIdx: 0, year: 1430 };
  if (!dobStr) return defaultVal;

  const monthsEn = ["Boishakh", "Jyaistha", "Ashadha", "Sravana", "Bhadra", "Ashwin", "Kartika", "Agrahayana", "Pausa", "Magha", "Phalguna", "Chaitra"];
  const monthsBn = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
  const monthsHi = ["बैसाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "अश्विन", "কার্তিক", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन", "चैत्र"];

  const cleanStr = toEnglishDigits(dobStr);
  let monthIdx = -1;

  for (let i = 0; i < 12; i++) {
    if (dobStr.includes(monthsBn[i])) {
      monthIdx = i;
      break;
    }
  }

  if (monthIdx === -1) {
    for (let i = 0; i < 12; i++) {
      if (dobStr.toLowerCase().includes(monthsEn[i].toLowerCase())) {
        monthIdx = i;
        break;
      }
    }
  }

  if (monthIdx === -1) {
    for (let i = 0; i < 12; i++) {
      if (dobStr.includes(monthsHi[i])) {
        monthIdx = i;
        break;
      }
    }
  }

  if (monthIdx === -1) {
    return defaultVal;
  }

  const numbers = cleanStr.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length >= 2) {
    return {
      day: numbers[0],
      monthIdx,
      year: numbers[1],
    };
  }

  return defaultVal;
}

export function formatBengaliDobString(day: number, monthIdx: number, year: number, lang?: string): string {
  const monthsEn = ["Boishakh", "Jyaistha", "Ashadha", "Sravana", "Bhadra", "Ashwin", "Kartika", "Agrahayana", "Pausa", "Magha", "Phalguna", "Chaitra"];
  const monthsBn = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
  const monthsHi = ["बैसाख", "ज्येष्ठ", "আषाढ़", "श्रावण", "भाद्रपद", "अश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन", "चैत्र"];

  if (lang === "hi") {
    const dayHi = toLocalDigits(String(day), "hi");
    const yearHi = toLocalDigits(String(year), "hi");
    return `${dayHi} ${monthsHi[monthIdx]} ${yearHi}`;
  } else if (lang === "en") {
    return `${day} ${monthsEn[monthIdx]} ${year}`;
  } else {
    const dayBn = toLocalDigits(String(day), "bn");
    const yearBn = toLocalDigits(String(year), "bn");
    return `${dayBn} ${monthsBn[monthIdx]} ${yearBn}`;
  }
}

interface BengaliDatePickerProps {
  value: string;
  lang?: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export function BengaliDatePicker({ value, lang, onChange, disabled = false }: BengaliDatePickerProps) {
  const { day, monthIdx, year } = useMemo(() => {
    return parseBengaliDobString(value, lang);
  }, [value, lang]);

  const months = useMemo(() => {
    const monthsEn = ["Boishakh", "Jyaistha", "Ashadha", "Sravana", "Bhadra", "Ashwin", "Kartika", "Agrahayana", "Pausa", "Magha", "Phalguna", "Chaitra"];
    const monthsBn = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
    const monthsHi = ["बैसाख", "ज्येष्ठ", "আषाढ़", "श्रावण", "भाद्रपद", "अश्विन", "কার্তিক", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन", "चैत्र"];
    if (lang === "hi") return monthsHi;
    if (lang === "en") return monthsEn;
    return monthsBn;
  }, [lang]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 32; i++) {
      arr.push(i);
    }
    return arr;
  }, []);

  const handleDayChange = (newDay: number) => {
    if (disabled) return;
    onChange(formatBengaliDobString(newDay, monthIdx, year, lang));
  };

  const handleMonthChange = (newMonthIdx: number) => {
    if (disabled) return;
    onChange(formatBengaliDobString(day, newMonthIdx, year, lang));
  };

  const handleYearChange = (newYear: number) => {
    if (disabled) return;
    onChange(formatBengaliDobString(day, monthIdx, newYear, lang));
  };

  const selectClasses = "rounded border border-[#e3d0ab] px-2 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent text-sm font-semibold text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all";
  const inputClasses = "rounded border border-[#e3d0ab] px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent text-sm font-bold text-slate-700 text-center disabled:opacity-50 disabled:cursor-not-allowed transition-all";

  return (
    <div className="flex gap-2 items-center w-full">
      {/* Day Select */}
      <div className="w-[4.5rem] shrink-0">
        <select
          className={selectClasses}
          value={day}
          onChange={(e) => handleDayChange(Number(e.target.value))}
          disabled={disabled}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {toLocalDigits(String(d), lang)}
            </option>
          ))}
        </select>
      </div>

      {/* Month Select */}
      <div className="flex-1">
        <select
          className={selectClasses}
          value={monthIdx}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          disabled={disabled}
        >
          {months.map((m, idx) => (
            <option key={idx} value={idx}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Year Input */}
      <div className="w-[5.5rem] shrink-0">
        <input
          type="number"
          className={`${inputClasses} w-full`}
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          min={1000}
          max={2500}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
