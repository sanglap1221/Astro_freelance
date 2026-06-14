"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../../components/AuthProvider";

export default function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const [username, setUsername] = useState("Sagar Ghosh");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center select-none"
      style={{
        background: "linear-gradient(135deg, #0B0D17 0%, #0E1120 40%, #16192B 100%)",
        color: "#e2e8f0",
      }}
    >
      {/* ── Starfield Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(#ffffff0a 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-0 opacity-40 animate-pulse"
          style={{
            backgroundImage: "radial-gradient(#ffffff06 2px, transparent 2px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Floating Orbs */}
        <div
          className="absolute top-[15%] left-[10%] w-56 h-56 rounded-full blur-xl"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(202,138,4,0.05), transparent)",
          }}
        />
        <div
          className="absolute bottom-[20%] right-[10%] w-72 h-72 rounded-full blur-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(147,51,234,0.05), transparent)",
          }}
        />
      </div>

      {/* ── Login Card ── */}
      <div className="relative z-10 w-full max-w-[400px] mx-4">
        {/* Session Expired Banner */}
        {sessionExpired && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium"
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#fbbf24",
            }}
          >
            <i className="fa-solid fa-clock mr-2" />
            Session Expired — Please Login Again
          </div>
        )}

        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(15, 18, 35, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(245,158,11,0.15)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xl mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(202,138,4,0.1))",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <span className="text-3xl">🕉️</span>
            </div>
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{
                background: "linear-gradient(90deg, #fde68a, #f59e0b, #d97706)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              জীবন জিজ্ঞাসা
            </h1>
            <p className="text-xs mt-1 font-medium tracking-widest uppercase" style={{ color: "rgba(245,158,11,0.6)" }}>
              Astrologer Login
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: "#94a3b8" }}>
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5" style={{ color: "#64748b" }}>
                  <i className="fa-solid fa-user text-sm" />
                </span>
                <input
                  type="text"
                  value={username}
                  readOnly
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all outline-none cursor-not-allowed opacity-75"
                  style={{
                    background: "rgba(30, 41, 59, 0.4)",
                    border: "1px solid rgba(100,116,139,0.15)",
                    color: "#94a3b8",
                  }}
                  id="login-username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: "#94a3b8" }}>
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5" style={{ color: "#64748b" }}>
                  <i className="fa-solid fa-lock text-sm" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoFocus
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm font-medium transition-all outline-none"
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(100,116,139,0.3)",
                    color: "#e2e8f0",
                  }}
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors"
                  style={{ color: "#64748b" }}
                  tabIndex={-1}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #800020, #590219)",
                boxShadow: "0 4px 20px rgba(128,0,32,0.4)",
              }}
              id="login-submit"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" />
                  Login
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-6 text-[0.625rem] font-medium" style={{ color: "rgba(148,163,184,0.5)" }}>
            Sagar Ghosh&apos;s Digital Astrology Board
          </p>
        </div>
      </div>
    </main>
  );
}
