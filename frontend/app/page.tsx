"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cosmic Controller States
  const [constellationsActive, setConstellationsActive] = useState(true);
  const [starDensity, setStarDensity] = useState(180);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const constellationsEnabledRef = useRef(true);
  const starCountRef = useRef(180);
  const cosmicEngineRef = useRef<{
    addCosmicObject: (type: "planet" | "star") => void;
    toggleConstellations: () => void;
    adjustStarDensity: (density: number) => void;
  } | null>(null);

  // Show toast utility
  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

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

  // Interactive background canvas setup
  useEffect(() => {
    // Dynamically set the body/html styling fallback using important to override any layout colors
    const originalBgColor = document.body.style.backgroundColor;
    const originalBgImage = document.body.style.backgroundImage;
    const originalHtmlBgColor = document.documentElement.style.backgroundColor;

    document.body.style.setProperty("background-color", "#03020c", "important");
    document.body.style.setProperty("background-image", "radial-gradient(circle at center, #060519 0%, #020108 100%)", "important");
    document.documentElement.style.setProperty("background-color", "#03020c", "important");

    // Inject a style tag to cover Next.js root and any other wrapper divs
    const styleTag = document.createElement("style");
    styleTag.id = "cosmic-bg-override";
    styleTag.textContent = `
      html, body, #__next, #__next > div { background-color: #03020c !important; }
    `;
    document.head.appendChild(styleTag);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: any[] = [];
    let planets: any[] = [];
    let mouseX: number | null = null;
    let mouseY: number | null = null;
    let celestialAngle = 0;
    let animationFrameId: number;

    // Star color randomizer
    const getCosmicStarColor = () => {
      const roll = Math.random();
      if (roll < 0.2) return "rgba(255, 215, 0, "; // Mystical Gold
      if (roll < 0.4) return "rgba(167, 139, 250, "; // Soft Cosmic Amethyst
      if (roll < 0.6) return "rgba(147, 197, 253, "; // Lunar Blue
      return "rgba(255, 255, 255, "; // Celestial White
    };

    // Initialize Star System
    const initStars = () => {
      stars = [];
      const count = starCountRef.current;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.2,
          speedX: (Math.random() - 0.5) * 0.03, // Faint drifting speed
          speedY: (Math.random() - 0.5) * 0.03,
          color: getCosmicStarColor(),
          twinkleSpeed: 0.005 + Math.random() * 0.015,
          brightness: Math.random(),
          twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        });
      }
    };

    // Initialize Planetary System centered on Zodiac astrolabe
    const initPlanets = () => {
      planets = [];

      // Orbiting the center of the screen
      planets.push({
        name: "Jupiter (বৃহস্পতি)",
        color: "#f59e0b", // Amber gold
        ringColor: "rgba(245, 158, 11, 0.15)",
        orbitRadiusMultiplier: 0.18, // dynamic sizing based on screen scale
        orbitSpeed: 0.0008,
        angle: Math.random() * Math.PI * 2,
        baseRadius: 8,
        glow: "rgba(245, 158, 11, 0.4)"
      });

      planets.push({
        name: "Saturn (শনি)",
        color: "#a3e635", // Lime/Vedic green
        ringColor: "rgba(163, 230, 53, 0.2)",
        orbitRadiusMultiplier: 0.28,
        orbitSpeed: -0.0004,
        angle: Math.random() * Math.PI * 2,
        baseRadius: 10,
        glow: "rgba(163, 230, 53, 0.3)",
        hasRings: true
      });

      planets.push({
        name: "Venus (শুক্র)",
        color: "#38bdf8", // Lunar light blue
        ringColor: "rgba(56, 189, 248, 0.15)",
        orbitRadiusMultiplier: 0.12,
        orbitSpeed: 0.0014,
        angle: Math.random() * Math.PI * 2,
        baseRadius: 6,
        glow: "rgba(56, 189, 248, 0.4)"
      });

      planets.push({
        name: "Mars (মঙ্গল)",
        color: "#ef4444", // Red planet Mangala
        ringColor: "rgba(239, 68, 68, 0.15)",
        orbitRadiusMultiplier: 0.22,
        orbitSpeed: 0.001,
        angle: Math.random() * Math.PI * 2,
        baseRadius: 5,
        glow: "rgba(239, 68, 68, 0.4)"
      });
    };

    const resizeCanvas = () => {
      let targetW = Math.floor(window.innerWidth);
      let targetH = Math.floor(window.innerHeight);

      // If dimensions are 0 (e.g. at startup in Electron), fall back to document elements if available
      if (targetW < 100 || targetH < 100) {
        targetW = document.documentElement.clientWidth || 1280;
        targetH = document.documentElement.clientHeight || 800;
        if (targetW < 100 || targetH < 100) {
          return; // Skip resize if dimensions are still completely invalid
        }
      }

      if (canvas.width !== targetW || canvas.height !== targetH || stars.length === 0 || planets.length === 0) {
        canvas.width = targetW;
        canvas.height = targetH;
        initStars();
        initPlanets();
      }
    };

    // Draw Zodiac chart astrolabe geometry faintly in the background of center
    const drawZodiacAstrolabe = (centerX: number, centerY: number) => {
      celestialAngle += 0.0003;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(celestialAngle);

      const baseSize = Math.min(canvas.width, canvas.height) * 0.35;
      if (baseSize < 100) {
        ctx.restore();
        return;
      }

      // Astrolabe outermost ring
      ctx.strokeStyle = "rgba(255, 215, 0, 0.04)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, baseSize, 0, Math.PI * 2);
      ctx.stroke();

      // Inner rings
      ctx.beginPath();
      ctx.arc(0, 0, baseSize - 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(129, 140, 248, 0.02)";
      ctx.beginPath();
      ctx.arc(0, 0, baseSize - 60, 0, Math.PI * 2);
      ctx.stroke();

      // Draw divisional sectors for 12 Zodiac Rasis (Constellations)
      ctx.strokeStyle = "rgba(255, 215, 0, 0.02)";
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * (baseSize - 60), Math.sin(angle) * (baseSize - 60));
        ctx.lineTo(Math.cos(angle) * baseSize, Math.sin(angle) * baseSize);
        ctx.stroke();

        // Faint star marks in each zodiac slice
        ctx.fillStyle = "rgba(255, 215, 0, 0.2)";
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle + 0.26) * (baseSize - 35),
          Math.sin(angle + 0.26) * (baseSize - 35),
          1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    };

    // Draw All elements in animation frame
    const render = () => {
      // Self-healing check: Ensure we only check/resize if window size is valid
      const targetW = Math.floor(window.innerWidth);
      const targetH = Math.floor(window.innerHeight);
      if (targetW >= 100 && targetH >= 100) {
        if (canvas.width !== targetW || canvas.height !== targetH || stars.length === 0 || planets.length === 0) {
          resizeCanvas();
        }
      }

      // Draw celestial dark backdrop with custom gradient
      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        200,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.8
      );
      bgGrad.addColorStop(0, "#060519");
      bgGrad.addColorStop(1, "#020108");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Zodiac Astrolabe in the direct center
      drawZodiacAstrolabe(canvas.width / 2, canvas.height / 2);

      // Render Stars & Handle Physics / Twinkles
      stars.forEach((star, index) => {
        // Update Star Drifts
        star.x += star.speedX;
        star.y += star.speedY;

        // Handle star fades (for spawned stardust from clicks)
        if (star.fade !== undefined) {
          star.brightness -= star.fade;
          if (star.brightness <= 0) {
            stars.splice(index, 1);
            return;
          }
        } else {
          // Constant twinkling for natural stars
          star.brightness += star.twinkleSpeed * star.twinkleDirection;
          if (star.brightness >= 1) {
            star.twinkleDirection = -1;
          } else if (star.brightness <= 0.15) {
            star.twinkleDirection = 1;
          }
        }

        // Interactive Mouse repulsion on Stars
        if (mouseX !== null && mouseY !== null) {
          const dx = star.x - mouseX;
          const dy = star.y - mouseY;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            const angle = Math.atan2(dy, dx);
            star.x += Math.cos(angle) * force * 1.5;
            star.y += Math.sin(angle) * force * 1.5;
          }
        }

        // Wrap around edges for normal stars
        if (star.fade === undefined) {
          if (star.x < 0) star.x = canvas.width;
          if (star.x > canvas.width) star.x = 0;
          if (star.y < 0) star.y = canvas.height;
          if (star.y > canvas.height) star.y = 0;
        }

        // Draw Star with current brightness opacity
        ctx.fillStyle = star.color + Math.max(0, Math.min(1, star.brightness)) + ")";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Faint glows on golden/large stars
        if (star.size > 1.2 && star.brightness > 0.6 && star.fade === undefined) {
          ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Constellation line engine (faint lines between close proximity stars)
      if (constellationsEnabledRef.current) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
            // Make constellation grids local instead of everywhere
            if (dist < 90 && stars[i].fade === undefined && stars[j].fade === undefined) {
              ctx.beginPath();
              ctx.moveTo(stars[i].x, stars[i].y);
              ctx.lineTo(stars[j].x, stars[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // Render and Orbit Planets (centered perfectly on the Zodiac clock)
      planets.forEach((planet) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Scale orbital paths based on screen limits so they are always visible
        const scaleSize = Math.min(canvas.width, canvas.height);
        const orbitRadius = scaleSize * planet.orbitRadiusMultiplier;

        // Orbit motion update
        planet.angle += planet.orbitSpeed;

        // Absolute celestial position
        const posX = centerX + Math.cos(planet.angle) * orbitRadius;
        const posY = centerY + Math.sin(planet.angle) * orbitRadius;

        // Draw orbital path line ring
        ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Planet Glow
        const radialGlow = ctx.createRadialGradient(posX, posY, 1, posX, posY, planet.baseRadius * 2);
        radialGlow.addColorStop(0, planet.color);
        radialGlow.addColorStop(0.3, planet.color + "88");
        radialGlow.addColorStop(1, "transparent");

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(posX, posY, planet.baseRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw actual Planet body sphere
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(posX, posY, planet.baseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Optional planetary rings (like Saturn)
        if (planet.hasRings) {
          ctx.strokeStyle = planet.ringColor;
          ctx.lineWidth = 2.5;
          ctx.save();
          ctx.translate(posX, posY);
          ctx.rotate(0.3); // Tilted planetary rings
          ctx.scale(1.8, 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, planet.baseRadius * 1.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Add nice faint label above planets to make it feel astronomical
        ctx.fillStyle = "rgba(255, 215, 0, 0.35)";
        ctx.font = "10px Montserrat, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(planet.name, posX, posY - planet.baseRadius - 6);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Event handlers for mouse interaction on window
    const handleWindowMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleWindowMouseLeave = () => {
      mouseX = null;
      mouseY = null;
    };

    const handleWindowClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const target = e.target as HTMLElement;

      // Prevent spawning stardust when clicking inside modals, header, buttons, inputs, or selections
      if (
        target.closest(".cosmic-glass") ||
        target.closest("form") ||
        target.closest("header") ||
        target.closest("button") ||
        target.closest("select") ||
        target.closest("input") ||
        target.closest(".scrollbar-thin")
      ) {
        return;
      }

      // Only spawn particles if clicking the body, canvas, or direct background layouts
      if (
        target === canvas ||
        target === document.body ||
        target.tagName === "DIV" ||
        target.id === "cosmic-container"
      ) {
        for (let i = 0; i < 15; i++) {
          stars.push({
            x: clickX,
            y: clickY,
            size: Math.random() * 2.5 + 0.5,
            speedX: (Math.random() - 0.5) * 4,
            speedY: (Math.random() - 0.5) * 4,
            color: `hsla(${Math.random() * 40 + 35}, 100%, 70%, `,
            brightness: 1,
            twinkleSpeed: 0,
            twinkleDirection: 1,
            fade: 0.02 + Math.random() * 0.02,
          });
        }
        showToast("Focussing astrological energies...");
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseout", handleWindowMouseLeave);
    window.addEventListener("click", handleWindowClick);

    render();


    // Register engine controls exposed to React UI
    cosmicEngineRef.current = {
      addCosmicObject: (type) => {
        if (type === "planet") {
          const planetNames = ["Mercury (বুধ)", "Neptune (বরুণ)", "Uranus (অরুণ)", "Pluto (যম)", "Soma (সোম)"];
          const colors = ["#f59e0b", "#3b82f6", "#06b6d4", "#6b7280", "#ec4899"];
          const index = Math.floor(Math.random() * planetNames.length);

          planets.push({
            name: planetNames[index],
            orbitRadiusMultiplier: 0.1 + Math.random() * 0.25,
            baseRadius: Math.random() * 5 + 4,
            color: colors[index],
            ringColor: colors[index] + "33",
            orbitSpeed: (Math.random() - 0.5) * 0.003,
            angle: Math.random() * Math.PI * 2,
            glow: colors[index] + "44",
          });
          showToast(`New astral body: ${planetNames[index]} mapped to orbits!`);
        } else if (type === "star") {
          // Trigger a meteor / shooting starfall burst
          for (let i = 0; i < 30; i++) {
            stars.push({
              x: Math.random() * canvas.width,
              y: 0,
              size: Math.random() * 2 + 1,
              speedX: Math.random() * 5 + 3,
              speedY: Math.random() * 6 + 5,
              color: "rgba(255, 255, 255, ",
              twinkleSpeed: 0.02,
              brightness: 1,
              twinkleDirection: -1,
              fade: 0.01 + Math.random() * 0.01,
            });
          }
          showToast("Vedic meteor alignment tracked!");
        }
      },
      toggleConstellations: () => {
        constellationsEnabledRef.current = !constellationsEnabledRef.current;
        setConstellationsActive(constellationsEnabledRef.current);
        showToast(
          `Constellation grids: ${constellationsEnabledRef.current ? "Enabled" : "Disabled"}`
        );
      },
      adjustStarDensity: (density) => {
        starCountRef.current = density;
        initStars();
      },
    };

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseout", handleWindowMouseLeave);
      window.removeEventListener("click", handleWindowClick);
      cancelAnimationFrame(animationFrameId);

      // Restore original styles when unmounting
      document.body.style.backgroundColor = originalBgColor;
      document.body.style.backgroundImage = originalBgImage;
      document.documentElement.style.backgroundColor = originalHtmlBgColor;
      const injected = document.getElementById("cosmic-bg-override");
      if (injected) injected.remove();
    };
  }, []);

  const triggerCelestialEvent = () => {
    showToast("ॐ Shivam Astrological Energy Harmonized");
    cosmicEngineRef.current?.addCosmicObject("star");
  };

  const handleFormSubmit = () => {
    sessionStorage.setItem("pending_birth_details", JSON.stringify(formValue));
    router.push("/create-report");
  };

  const getInitials = (name?: string) => {
    if (!name) return "SG";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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
    <div
      id="cosmic-container"
      className="h-screen md:overflow-hidden max-md:h-auto max-md:min-h-screen max-md:overflow-y-auto text-gray-100 flex flex-col justify-between relative selection:bg-amber-500 selection:text-black font-sans"
    >
      {/* Interactive Canvas Background (fixed behind all content) */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 block pointer-events-none" style={{ backgroundColor: "transparent" }} />

      {/* Header Section */}
      <header className="relative w-full px-6 py-2.5 flex flex-wrap justify-between items-center gap-4 z-10 bg-gradient-to-b from-black/80 to-transparent">
        {/* User Profile Info */}
        <div className="flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-full border border-yellow-500/10 hover:border-yellow-500/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black font-bold text-sm shadow-md shadow-yellow-500/20">
            {getInitials(user?.username)}
          </div>
          <span className="text-sm font-medium tracking-wide text-amber-100">{user?.username}</span>
        </div>

        {/* Navigation Action Control Center */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/20 text-indigo-200 text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate animate-spin-slow"></i>
            <span>Reload</span>
          </button>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="px-4 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/20 text-amber-200 text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 cursor-pointer"
          >
            <i className="fa-solid fa-circle-info"></i>
            <span>About</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="px-4 py-2 rounded-lg bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-500/20 text-yellow-200 text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 cursor-pointer"
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>Admin</span>
            </button>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 text-rose-200 text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 cursor-pointer"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Hero Workspace Area */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-4 text-center z-10 relative">
        <div className="max-w-4xl mx-auto flex flex-col items-center">

          {/* Beautiful Pulsing Mystic OM Seal */}
          <div className="relative mb-4 group cursor-pointer" onClick={triggerCelestialEvent}>
            {/* Dynamic rotating aura rings */}
            <div className="absolute -inset-4 rounded-3xl bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-all duration-1000"></div>
            <div className="absolute inset-0 rounded-2xl border border-amber-500/20 animate-spin-slow"></div>
            <div className="absolute inset-2 rounded-2xl border border-indigo-500/10 animate-reverse-spin"></div>

            {/* Main tilted square containing the sacred symbol */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-950 to-purple-950 text-amber-300 rounded-2xl shadow-xl shadow-purple-950/50 flex items-center justify-center transform rotate-45 border border-amber-500/40 group-hover:border-amber-400 group-hover:scale-105 transition-all duration-500">
              <span className="transform -rotate-45 text-2xl sm:text-3xl font-bold glow-text-gold">
                ॐ
              </span>
            </div>
          </div>

          {/* ASTRO Brand Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-widest font-mystic text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 glow-text-gold mb-1.5">
            ASTRO
          </h1>

          {/* Subtitle */}
          <h2 className="text-xs sm:text-sm lg:text-base font-semibold tracking-[0.3em] text-amber-300/90 uppercase mb-6 max-w-lg mx-auto">
            Sagar Ghosh&apos;s Digital Astrology Board
          </h2>

          {/* Dynamic CTA / Report Generation Button */}
          <button
            onClick={() => setIsFormOpen(true)}
            className="glow-button group relative overflow-hidden bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-700 hover:to-rose-600 text-white px-6 py-3 rounded-xl text-sm sm:text-base font-bold tracking-wide flex items-center space-x-3 transition-all duration-300 border border-red-500/30 cursor-pointer"
          >
            <span className="font-mystic font-semibold tracking-wider">Create Report</span>
            <span className="text-red-200">/</span>
            <span className="font-bengali font-normal text-xs sm:text-sm">কোষ্ঠী তৈরি করুন</span>
            <i className="fa-solid fa-arrow-right-long transform group-hover:translate-x-2 transition-transform duration-300 text-amber-400"></i>
          </button>

          {/* Real-time cosmic engine controller to let users customize the look */}
          <div className="mt-6 cosmic-glass px-4 py-2 rounded-2xl flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[11px] text-gray-400 shadow-lg border border-white/5">
            <span className="flex items-center space-x-1 text-amber-300 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cosmic Engine Active</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <button
              onClick={() => cosmicEngineRef.current?.addCosmicObject("planet")}
              className="hover:text-amber-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <i className="fa-solid fa-globe"></i>
              <span>Add Planet</span>
            </button>
            <button
              onClick={() => cosmicEngineRef.current?.addCosmicObject("star")}
              className="hover:text-amber-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span>Spawn Starfall</span>
            </button>
            <button
              onClick={() => cosmicEngineRef.current?.toggleConstellations()}
              className="hover:text-amber-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <i className="fa-solid fa-circle-nodes"></i>
              <span>{constellationsActive ? "Disable Constellations" : "Enable Constellations"}</span>
            </button>
            <span className="hidden md:inline text-slate-600">|</span>
            <div className="flex items-center space-x-1.5">
              <i className="fa-solid fa-sliders text-amber-500/70 text-[10px]"></i>
              <span className="text-[10px]">Density:</span>
              <input
                type="range"
                min="50"
                max="350"
                value={starDensity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setStarDensity(val);
                  cosmicEngineRef.current?.adjustStarDensity(val);
                }}
                className="w-14 sm:w-18 accent-amber-500 cursor-pointer h-1 rounded bg-slate-800 appearance-none"
              />
            </div>
          </div>

        </div>
      </main>

      {/* Footer Section */}
      <footer className="relative w-full px-6 py-3.5 z-10 bg-gradient-to-t from-black/95 to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">

          {/* Developer Card (highly compact to prevent vertical cutoff) */}
          <div
            onClick={() => window.open("https://sanglap-s-portfolio.vercel.app/", "_blank")}
            className="cosmic-glass cosmic-glass-hover p-3 rounded-xl text-left w-full md:w-auto max-w-sm transition-all duration-300 shadow-md cursor-pointer"
          >
            <p className="text-amber-400 font-semibold tracking-wider uppercase mb-0.5 text-[9px]">Developed By</p>
            <p className="text-xs font-bold text-gray-200 leading-tight">Sanglap Ghosh</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1.5">Full Stack Developer</p>
            <div className="space-y-0.5 text-gray-400 font-light text-[10px]">
              <p className="flex items-center space-x-1.5">
                <i className="fa-solid fa-phone text-amber-400/70 text-[9px]"></i>
                <span>+91 9883483390</span>
              </p>
              <p className="flex items-center space-x-1.5">
                <i className="fa-solid fa-globe text-amber-400/70 text-[9px]"></i>
                <span className="hover:text-amber-300 transition-colors underline decoration-amber-500/30">
                  sanglap-s-portfolio.vercel.app
                </span>
              </p>
            </div>
          </div>

          {/* Mystical Quote / Status */}
          <div className="text-center md:text-right text-gray-500 max-w-xs">
            <p className="italic font-light">&ldquo;The stars only incline, they do not bind.&rdquo;</p>
          </div>
        </div>
      </footer>

      {/* MOBILE-SIZED FORM OVERLAY (Modal) */}
      {isFormOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFormOpen(false);
            }
          }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
        >

          {/* Card Wrapper */}
          <div className="w-full max-w-[430px] max-h-[90vh] bg-[#fdfcf9] border border-[#ebdcb9] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto relative flex flex-col text-slate-800 animate-scale-up scrollbar-thin">

            {/* Close Button */}
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-sm cursor-pointer"
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

      {/* Cosmic Notification Toast */}
      <div
        className={`fixed bottom-6 right-6 z-50 cosmic-glass px-4 py-3 rounded-xl shadow-lg border border-amber-500/30 text-xs text-amber-200 transition-all duration-300 flex items-center space-x-2 ${toastVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
          }`}
      >
        <i className="fa-solid fa-star-of-david text-amber-400"></i>
        <span>{toastMessage || "Cosmic energy updated."}</span>
      </div>

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}