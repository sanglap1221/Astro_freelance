"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportForm } from "../components/ReportForm";
import { useAuth } from "../components/AuthProvider";
import AboutModal from "../components/AboutModal";
import type { ReportInput } from "../types/report";

const initialValue: ReportInput = {
  name: "",
  father_name: "",
  dob: "2004-08-13",
  time: "14:42",
  place: "Kolkata",
  mobile: "",
  planet_overrides: {},
  override_moon_longitude: "",
  override_ascendant_longitude: "",
};

export default function HomePage() {
  const router = useRouter();
  const { user, isAdmin, isAuthenticated, isLoading, logout } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [formValue, setFormValue] = useState<ReportInput>(initialValue);

  // Open the form modal automatically if the URL has ?new=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("new") === "true") {
        setIsFormOpen(true);
        // Clean up the URL search params so reloading doesn't re-open it unexpectedly
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  const handleFormSubmit = () => {
    sessionStorage.setItem("pending_birth_details", JSON.stringify(formValue));
    router.push("/create-report");
  };

  // Show nothing while auth is loading
  if (isLoading) {
    return (
      <main className="w-screen h-screen flex items-center justify-center" style={{ background: "#0B0D17" }}>
        <div className="text-amber-400 animate-pulse text-lg">
          <i className="fa-solid fa-spinner fa-spin mr-2" />
          Loading...
        </div>
      </main>
    );
  }

  // Don't render if not authenticated (AuthProvider will redirect)
  if (!isAuthenticated) return null;

  return (
    <main className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center bg-gradient-to-br from-[#0B0D17] via-[#0E1120] to-[#16192B] text-slate-100 select-none">
      
      {/* ── Top Bar (Auth Controls) ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Left: User Info */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-md"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(202,138,4,0.15))",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#fbbf24",
            }}
          >
            <i className="fa-solid fa-user" />
          </div>
          <span className="text-xs font-medium text-slate-400">
            {user?.username}
          </span>
        </div>

        {/* Right: Admin + Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#60a5fa",
            }}
            id="reload-btn"
            title="Reload Page"
          >
            <i className="fa-solid fa-arrows-rotate text-[0.625rem]" />
            Reload
          </button>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#fbbf24",
            }}
            id="about-btn"
          >
            <i className="fa-solid fa-circle-info text-[0.625rem]" />
            About
          </button>
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#fbbf24",
              }}
              id="admin-panel-btn"
            >
              <i className="fa-solid fa-shield-halved text-[0.625rem]" />
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171",
            }}
            id="logout-btn"
          >
            <i className="fa-solid fa-right-from-bracket text-[0.625rem]" />
            Logout
          </button>
        </div>
      </div>

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
            Astro 
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-amber-500/80 uppercase">
            Sagar Ghosh&apos;s Digital Astrology Board
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

      {/* ── Developer Info (Bottom Left) ── */}
      <div 
        className="absolute bottom-4 left-4 z-20 text-[10px] sm:text-xs font-sans leading-normal tracking-wide py-2 px-3.5 rounded-xl border select-none transition-all duration-300 hover:scale-102 hover:border-amber-500/40"
        style={{
          background: "rgba(14,17,32,0.6)",
          borderColor: "rgba(245,158,11,0.15)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div className="text-slate-400 font-semibold mb-0.5">Developed By</div>
        <div className="mb-0.5">
          <span
            onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
            className="font-bold text-amber-400 hover:underline cursor-pointer"
          >
            Sanglap Ghosh
          </span>
        </div>
        <div 
          onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
          className="text-slate-300 text-[9px] font-medium mb-1 cursor-pointer hover:text-amber-400 transition-colors"
        >
          Full Stack Developer
        </div>
        <div className="text-slate-400">
          Mobile: <a href="tel:+919883483390" className="text-slate-200 hover:text-amber-400 font-medium">+91 9883483390</a>
        </div>
        <div className="text-slate-400">
          Portfolio: <span onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")} className="text-amber-400/90 hover:underline font-medium cursor-pointer">sanglap-s-portfolio.vercel.app</span>
        </div>
      </div>

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}