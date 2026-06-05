"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReportForm } from "../components/ReportForm";
import type { ReportInput } from "../types/report";

const initialValue: ReportInput = {
  name: "",
  father_name: "",
  dob: "2004-08-13",
  time: "14:42",
  place: "Kolkata",
  mobile: "",
  true_node: true,
  planet_overrides: {},
  override_moon_longitude: "",
  override_ascendant_longitude: "",
};

export default function HomePage() {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValue, setFormValue] = useState<ReportInput>(initialValue);

  const handleFormSubmit = () => {
    sessionStorage.setItem("pending_birth_details", JSON.stringify(formValue));
    router.push("/create-report");
  };

  return (
    <main className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center bg-gradient-to-br from-[#0B0D17] via-[#0E1120] to-[#16192B] text-slate-100 select-none">
      
      {/* Dynamic Starfield & Planet Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep starfield background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff06_2px,transparent_2px)] [background-size:48px_48px] opacity-40 animate-pulse" />
        
        {/* Floating Planet 1: Golden Sun / Jupiter Sphere */}
        <div className="absolute top-[15%] left-[10%] w-56 h-56 rounded-full bg-gradient-to-br from-amber-500/10 via-yellow-600/5 to-transparent blur-xl animate-float-slow" />
        <div className="absolute top-[15%] left-[10%] w-48 h-48 rounded-full border border-amber-500/10 scale-95 animate-orbit-slow" />
        
        {/* Floating Planet 2: Deep Blue Neptune Sphere */}
        <div className="absolute bottom-[20%] right-[10%] w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-600/5 to-transparent blur-2xl animate-float-slower" />
        <div className="absolute bottom-[20%] right-[10%] w-64 h-64 rounded-full border border-indigo-500/10 scale-105 animate-orbit-slower" />

        {/* Floating Planet 3: Crimson Mars Sphere */}
        <div className="absolute top-[60%] left-[65%] w-36 h-36 rounded-full bg-gradient-to-br from-red-600/10 via-amber-700/5 to-transparent blur-lg animate-float-fast" />
        <div className="absolute top-[60%] left-[65%] w-32 h-32 rounded-full border border-red-500/10 scale-90" />
      </div>

      {/* Landing Content Container */}
      <div className="relative z-10 text-center px-4 max-w-lg flex flex-col items-center gap-6">
        
        {/* Cosmic Astrological Mandala Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 flex items-center justify-center shadow-xl animate-spin-slow">
          <span className="text-3xl sm:text-4xl text-amber-400">🕉️</span>
        </div>

        {/* Brand Typography */}
        <div className="space-y-2.5">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 drop-shadow-sm font-sans uppercase">
            Astro Freelance
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-amber-500/80 uppercase">
            Kaka Babu&apos;s Digital Astrology Board
          </p>
        </div>

        <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed">
          Create highly customized, traditional Bengali birth charts, planet configurations, and Vimshottari dasha sheets with professional WYSIWYG editing.
        </p>

        {/* Primary CTA Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="group relative mt-2 px-8 py-3.5 bg-gradient-to-r from-[#800020] to-[#590219] hover:from-[#590219] hover:to-[#400112] text-white text-sm sm:text-base font-bold rounded-2xl border border-amber-500/30 shadow-lg shadow-red-950/40 hover:scale-105 hover:border-amber-400 hover:shadow-2xl hover:shadow-red-950/60 transition-all duration-300 flex items-center gap-2"
        >
          <span>Create Report / কোষ্ঠী তৈরি করুন</span>
          <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>

      {/* STEP 2: MOBILE-SIZED FORM OVERLAY (Modal) */}
      {isFormOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          
          {/* Card Wrapper */}
          <div className="w-full max-w-[430px] max-h-[90vh] bg-[#fdfcf9] border border-[#ebdcb9] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto relative flex flex-col text-slate-800 animate-scale-up scrollbar-thin">
            
            {/* Close Button */}
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-sm"
              aria-label="Close form"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>

            {/* Bengali Title Header */}
            <div className="text-center mb-5 relative mt-2">
              <span className="text-[0.625rem] font-bold uppercase tracking-widest block mb-0.5 text-amber-800">
                কোষ্ঠী ও জীবন জিজ্ঞাসা
              </span>
              <h2 className="text-2xl font-extrabold tracking-wide text-[#800020] bengali-serif">
                জন্ম বিবরণী
              </h2>
              <div className="flex justify-center items-center gap-2 text-amber-600 mt-1">
                <span className="h-[1px] w-10 bg-[#ebdcb9]"></span>
                <i className="fa-solid fa-om text-sm"></i>
                <span className="h-[1px] w-10 bg-[#ebdcb9]"></span>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1">
              <ReportForm
                value={formValue}
                onChange={setFormValue}
                onSubmit={handleFormSubmit}
                loading={false}
              />
            </div>

            <p className="text-center mt-4 text-[0.625rem] text-slate-500 font-medium">
              Inspired by traditional Bengali palmistry &amp; astrology charts
            </p>
          </div>
        </div>
      )}
    </main>
  );
}