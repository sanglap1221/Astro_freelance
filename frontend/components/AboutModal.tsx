"use client";

import React from "react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
    >
      <div 
        className="w-full max-w-[420px] rounded-2xl border shadow-2xl p-6 relative flex flex-col animate-scale-up text-slate-100"
        style={{
          background: "linear-gradient(135deg, #0e1120 0%, #16192b 100%)",
          borderColor: "rgba(245, 158, 11, 0.3)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          aria-label="Close modal"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        {/* Header */}
        <div className="text-center mb-5 mt-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 flex items-center justify-center shadow-lg mb-3">
            <span className="text-2xl">💻</span>
          </div>
          <h2 className="text-xl font-bold text-amber-400 tracking-wide uppercase">
            About Developer
          </h2>
          <div className="flex justify-center items-center gap-2 text-amber-500/50 mt-1">
            <span className="h-[1px] w-8 bg-amber-500/30"></span>
            <i className="fa-solid fa-code text-xs"></i>
            <span className="h-[1px] w-8 bg-amber-500/30"></span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm">
          {/* Developer Info */}
          <div className="text-center border-b border-white/5 pb-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Developer</p>
            <span 
              onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
              className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 hover:underline inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Sanglap Ghosh
              <i className="fa-solid fa-arrow-up-right-from-square text-xs text-amber-400/80"></i>
            </span>
            <p 
              onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
              className="text-xs text-slate-300 font-medium mt-0.5 cursor-pointer hover:text-amber-400 transition-colors"
            >
              Full Stack Developer
            </p>
          </div>

          {/* Technical Skills */}
          <div className="border-b border-white/5 pb-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold font-sans">Technical Skills</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 pl-1">
              {["Python", "FastAPI", "React", "Next.js", "Electron", "MongoDB", "Flutter"].map((skill) => (
                <div key={skill} className="flex items-center gap-2 text-xs text-slate-300">
                  <i className="fa-solid fa-circle-check text-amber-500 text-[10px]" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-amber-400/85">
                <i className="fa-solid fa-phone text-xs"></i>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">Mobile</p>
                <a href="tel:+919883483390" className="text-xs font-semibold text-slate-200 hover:text-amber-400 transition-colors">
                  +91 9883483390
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-amber-400/85">
                <i className="fa-solid fa-globe text-xs"></i>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-0.5 font-sans">Portfolio</p>
                <span 
                  onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
                  className="text-xs font-semibold text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  sanglap-s-portfolio.vercel.app
                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-3 border-t border-white/5">
          <button
            onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500/20 to-yellow-600/10 hover:from-amber-500/30 hover:to-yellow-600/20 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 shadow-md transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <i className="fa-solid fa-user-tie"></i>
            <span>Developer Portfolio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
