"use client";

import { type FormEvent, useState } from "react";
import type { ReportInput } from "../types/report";
import { BengaliDatePicker, formatBengaliDobString } from "./BengaliDatePicker";
import { searchPlaces, type PlaceSuggestion } from "../services/api";

type ReportFormProps = {
  value: ReportInput;
  loading?: boolean;
  onChange: (value: ReportInput) => void;
  onSubmit: () => void;
};

interface LocationOption {
  display_name: string;
  lat: string | number;
  lon: string | number;
  timezone: string;
}

/* ─── Preset Locations ─── */
const PRESET_LOCATIONS: LocationOption[] = [
  { display_name: "Kolkata, West Bengal, India", lat: "22.5726", lon: "88.3639", timezone: "Asia/Kolkata" },
  { display_name: "Howrah, West Bengal, India", lat: "22.5958", lon: "88.2636", timezone: "Asia/Kolkata" },
  { display_name: "Bongaon, West Bengal, India", lat: "23.0434", lon: "88.8235", timezone: "Asia/Kolkata" },
  { display_name: "Habra, West Bengal, India", lat: "22.8321", lon: "88.6315", timezone: "Asia/Kolkata" },
  { display_name: "Barasat, West Bengal, India", lat: "22.7200", lon: "88.4801", timezone: "Asia/Kolkata" },
  { display_name: "Barrackpore, West Bengal, India", lat: "22.7658", lon: "88.3784", timezone: "Asia/Kolkata" },
  { display_name: "Durgapur, West Bengal, India", lat: "23.5204", lon: "87.3119", timezone: "Asia/Kolkata" },
  { display_name: "Siliguri, West Bengal, India", lat: "26.7271", lon: "88.3953", timezone: "Asia/Kolkata" },
  { display_name: "New Delhi, Delhi, India", lat: "28.6139", lon: "77.2090", timezone: "Asia/Kolkata" },
  { display_name: "Mumbai, Maharashtra, India", lat: "19.0760", lon: "72.8777", timezone: "Asia/Kolkata" },
  { display_name: "London, England, United Kingdom", lat: "51.5074", lon: "-0.1278", timezone: "Europe/London" },
  { display_name: "New York, NY, United States", lat: "40.7128", lon: "-74.0060", timezone: "America/New_York" },
  { display_name: "Sydney, NSW, Australia", lat: "-33.8688", lon: "151.2093", timezone: "Australia/Sydney" },
];

function updateField(
  current: ReportInput,
  onChange: (value: ReportInput) => void,
  field: keyof ReportInput,
  nextValue: string,
) {
  onChange({ ...current, [field]: nextValue });
}

function updateBooleanField(
  current: ReportInput,
  onChange: (value: ReportInput) => void,
  field: keyof ReportInput,
  nextValue: boolean,
) {
  onChange({ ...current, [field]: nextValue });
}

export function ReportForm({ value, loading = false, onChange, onSubmit }: ReportFormProps) {
  const [showAstrologer, setShowAstrologer] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showingPresets, setShowingPresets] = useState(false);

  const handlePlaceChange = async (query: string) => {
    updateField(value, onChange, "place", query);
    
    if (query.trim().length < 3) {
      // Show filtered presets if user typed 1-2 chars
      if (query.trim().length > 0) {
        const filtered = PRESET_LOCATIONS.filter((p) =>
          p.display_name.toLowerCase().includes(query.trim().toLowerCase())
        );
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
        setShowingPresets(true);
      } else {
        setSuggestions(PRESET_LOCATIONS);
        setShowDropdown(true);
        setShowingPresets(true);
      }
      return;
    }

    setShowingPresets(false);
    setIsSearching(true);
    try {
      const data = await searchPlaces(query, 5);
      setSuggestions(
        data.map((item) => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
          timezone: item.timezone,
        }))
      );
      setShowDropdown(data.length > 0);
    } catch (err) {
      console.error("Geocoding fetch failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceFocus = () => {
    if (value.place.trim().length < 3) {
      // Show presets on focus when field is empty or has short text
      const query = value.place.trim().toLowerCase();
      const filtered = query.length > 0
        ? PRESET_LOCATIONS.filter((p) => p.display_name.toLowerCase().includes(query))
        : PRESET_LOCATIONS;
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
      setShowingPresets(true);
    } else if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleSelectSuggestion = (sug: LocationOption) => {
    onChange({
      ...value,
      place: sug.display_name,
      latitude: typeof sug.lat === "number" ? sug.lat : parseFloat(sug.lat),
      longitude: typeof sug.lon === "number" ? sug.lon : parseFloat(sug.lon),
      timezone: sug.timezone,
    });
    setShowDropdown(false);
    setShowingPresets(false);
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const inputClasses = "w-full px-3 py-2.5 text-sm bg-white border border-[#e3d0ab] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent transition-all placeholder:text-slate-400";
  const labelClasses = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="grid gap-3.5">
      {/* Name */}
      <label className="grid gap-1 text-sm">
        <span className={labelClasses}>
          Name / নাম <span className="text-red-500">*</span>
        </span>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">
            <i className="fa-solid fa-user"></i>
          </span>
          <input
            className={`${inputClasses} pl-9`}
            value={value.name}
            onChange={(event) => updateField(value, onChange, "name", event.target.value)}
            placeholder="Enter Full Name"
            required
          />
        </div>
      </label>

      {/* Father's Name */}
      <label className="grid gap-1 text-sm">
        <span className={labelClasses}>Father&apos;s Name / পিতার নাম</span>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">
            <i className="fa-solid fa-user-friends"></i>
          </span>
          <input
            className={`${inputClasses} pl-9`}
            value={value.father_name ?? ""}
            onChange={(event) => updateField(value, onChange, "father_name", event.target.value)}
            placeholder="Enter Father's Name"
          />
        </div>
      </label>

      {/* DOB and Time Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span className={labelClasses}>Date of Birth / জন্ম তারিখ</span>
          <input
            type="date"
            className={inputClasses}
            value={value.dob}
            onChange={(event) => updateField(value, onChange, "dob", event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className={labelClasses}>Time / জন্ম সময়</span>
          <input
            type="time"
            className={inputClasses}
            value={value.time}
            onChange={(event) => updateField(value, onChange, "time", event.target.value)}
            required
          />
        </label>
      </div>

      {/* Bengali Date Section */}
      <div className="grid gap-2 text-sm bg-amber-50/20 p-3.5 rounded-xl border border-[#e3d0ab]/40">
        <div className="flex items-center justify-between">
          <span className={labelClasses + " !mb-0 font-bold"}>Bengali Date (Manual) / বাংলা তারিখ (ম্যানুয়াল)</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={value.bengali_date_auto ?? true}
              onChange={(e) => {
                const auto = e.target.checked;
                onChange({
                  ...value,
                  bengali_date_auto: auto,
                  bengali_dob: auto ? "" : formatBengaliDobString(1, 0, 1430, value.language)
                });
              }}
              className="rounded h-3.5 w-3.5 text-indigo-650 focus:ring-0 cursor-pointer"
            />
            <span>Calculate Automatically / স্বয়ংক্রিয় গণনা</span>
          </label>
        </div>
        <BengaliDatePicker
          value={value.bengali_dob ?? ""}
          lang={value.language}
          onChange={(val) => onChange({ ...value, bengali_dob: val })}
          disabled={value.bengali_date_auto ?? true}
        />
      </div>

      {/* Place Row */}
      <div className="relative grid gap-1 text-sm">
        <span className={labelClasses}>Place of Birth / জন্মস্থান</span>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">
            <i className="fa-solid fa-map-marker-alt"></i>
          </span>
          <input
            className={`${inputClasses} pl-8`}
            value={value.place}
            onChange={(event) => handlePlaceChange(event.target.value)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
            onFocus={handlePlaceFocus}
            placeholder="City"
            required
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-slate-400">
              <i className="fa-solid fa-spinner fa-spin"></i>
            </span>
          )}
        </div>
        {showDropdown && (
          <ul className="absolute z-50 left-0 right-0 top-[4.25rem] mt-1 max-h-60 overflow-auto rounded-xl border border-[#e3d0ab] bg-white py-1 shadow-xl text-slate-700 text-xs">
            {showingPresets && (
              <li className="px-3 py-1.5 text-[0.625rem] font-bold text-amber-700 bg-amber-50/60 uppercase tracking-wider border-b border-[#e3d0ab]/50">
                📍 Quick Select
              </li>
            )}
            {suggestions.map((sug, idx) => (
              <li
                key={idx}
                onClick={() => handleSelectSuggestion(sug)}
                className="cursor-pointer px-3 py-2 hover:bg-amber-50 transition-colors flex items-center justify-between gap-2 border-b border-[#f3e9d2] last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {showingPresets && (
                    <span className="text-amber-600 text-[0.6875rem] shrink-0">
                      <i className="fa-solid fa-location-dot"></i>
                    </span>
                  )}
                  <span className="font-medium truncate">{sug.display_name}</span>
                </div>
                {sug.timezone && (
                  <span className="text-[0.625rem] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 font-mono">
                    {sug.timezone}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mobile and Language Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mobile */}
        <label className="grid gap-1 text-sm">
          <span className={labelClasses}>Mobile / মোবাইল নম্বর</span>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">
              <i className="fa-solid fa-phone"></i>
            </span>
            <input
              className={`${inputClasses} pl-8`}
              value={value.mobile ?? ""}
              onChange={(event) => updateField(value, onChange, "mobile", event.target.value)}
              placeholder="Mobile Number"
            />
          </div>
        </label>

        {/* Language */}
        <label className="grid gap-1 text-sm">
          <span className={labelClasses}>Language / ভাষা</span>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">
              <i className="fa-solid fa-language"></i>
            </span>
            <select
              className={`${inputClasses} pl-8 pr-8 appearance-none bg-white`}
              value={value.language ?? "bn"}
              onChange={(event) => updateField(value, onChange, "language", event.target.value)}
            >
              <option value="bn">Bengali / বাংলা</option>
              <option value="en">English / English</option>
              <option value="hi">Hindi / हिंदी</option>
            </select>
            <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 text-[0.625rem]">
              <i className="fa-solid fa-chevron-down text-[0.625rem]"></i>
            </span>
          </div>
        </label>
      </div>

      {/* Engine Settings — removed. Hardcoded in backend:
          TRUE_NODE = True, WORKFLOW = Traditional Bengali NC Lahiri */}


      {/* CTA Button */}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full py-3 bg-gradient-to-r from-[#800020] to-[#590219] hover:from-[#590219] hover:to-[#400112] text-white font-semibold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 btn-press disabled:opacity-60"
      >
        <span>{loading ? "Calculating..." : "Generate Kundli / কোষ্ঠী তৈরি করুন"}</span>
        {!loading && <i className="fa-solid fa-arrow-right text-xs animate-pulse"></i>}
        {loading && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
      </button>
    </form>
  );
}
