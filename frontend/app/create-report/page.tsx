"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PdfViewer } from "../../components/PdfViewer";
import { ReportForm } from "../../components/ReportForm";
import { calculateReport, renderPdf, API } from "../../services/api";
import type { ReportInput, ReportState, CustomerState, AstrologyState, DashaRow } from "../../types/report";

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

function toEnglishDigits(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)));
}

function toBengaliDigits(text: string): string {
  return text.replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)]);
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

function normalizeEditorInput(text: string): string {
  // Users can type standard keyboard digits; keep state Bengali-friendly for PDF rendering.
  return toBengaliDigits(text);
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
    true_node: formValue.true_node ?? reportState?.true_node ?? true,
    planet_overrides: planetOverrides,
    override_moon_longitude: formValue.override_moon_longitude?.trim() || undefined,
    override_ascendant_longitude: Number.isFinite(overrideAscendant) ? String(overrideAscendant) : undefined,
  };
}
function calculatePlanetCoords(state: ReportState): Record<string, { x: number, y: number }> {
  const coords: Record<string, { x: number, y: number }> = {};
  const lagnaIdx = state.summary.lagna_sign_index ?? 0;

  const houseLayout = [
    { numX: 150, numY: 85, planetsX: 150, planetsY: 50, poly: "100,100 200,100 150,0", signIdx: 0 },
    { numX: 78, numY: 45, planetsX: 65, planetsY: 35, poly: "0,0 100,0 100,100", signIdx: 1 },
    { numX: 22, numY: 80, planetsX: 30, planetsY: 50, poly: "0,0 0,100 100,100", signIdx: 2 },
    { numX: 50, numY: 185, planetsX: 60, planetsY: 150, poly: "100,100 100,200 0,150", signIdx: 3 },
    { numX: 22, numY: 225, planetsX: 45, planetsY: 245, poly: "0,200 0,300 100,300", signIdx: 4 },
    { numX: 78, numY: 280, planetsX: 65, planetsY: 245, poly: "100,200 100,300 0,300", signIdx: 5 },
    { numX: 150, numY: 285, planetsX: 150, planetsY: 220, poly: "100,200 200,200 150,300", signIdx: 6 },
    { numX: 222, numY: 280, planetsX: 235, planetsY: 245, poly: "200,200 200,300 300,300", signIdx: 7 },
    { numX: 278, numY: 225, planetsX: 255, planetsY: 245, poly: "300,200 300,300 200,300", signIdx: 8 },
    { numX: 250, numY: 185, planetsX: 240, planetsY: 150, poly: "200,100 200,200 300,150", signIdx: 9 },
    { numX: 222, numY: 30, planetsX: 245, planetsY: 45, poly: "200,0 300,0 200,100", signIdx: 11 },
    { numX: 278, numY: 80, planetsX: 255, planetsY: 60, poly: "300,0 200,100 300,100", signIdx: 10 }
  ];

  const getGroupShift = (signIdx: number): { dx: number; dy: number } => {
    switch (signIdx) {
      case 0: return { dx: 0, dy: -12 };
      case 1: return { dx: 12, dy: -12 };
      case 2: return { dx: -12, dy: 12 };
      case 3: return { dx: 0, dy: -12 };
      case 4: return { dx: 12, dy: 12 };
      case 5: return { dx: 12, dy: 12 };
      case 6: return { dx: 0, dy: -12 };
      case 7: return { dx: -12, dy: 12 };
      case 8: return { dx: 12, dy: -12 };
      case 9: return { dx: 0, dy: -12 };
      case 10: return { dx: -12, dy: 12 };
      case 11: return { dx: 12, dy: -12 };
      default: return { dx: 0, dy: 0 };
    }
  };

  houseLayout.forEach((layout) => {
    const items: string[] = [];
    if (layout.signIdx === lagnaIdx) {
      items.push("ল");
    }
    const house = state.house_chart[layout.signIdx];
    if (house && house.planets) {
      items.push(...house.planets);
    }

    if (items.length === 0) return;

    const count = items.length;
    const isCornerHouse = [1, 2, 4, 5, 7, 8, 10, 11].includes(layout.signIdx);
    const houseCoords: { name: string; x: number; y: number }[] = [];

    items.forEach((itemName, idx) => {
      let baseX = layout.planetsX;
      let baseY = layout.planetsY;

      if (isCornerHouse) {
        const maxShift = 18;
        const maxIndexOffset = (count - 1) * 0.5;
        const idealStep = 13;
        const step = maxIndexOffset > 0 ? Math.min(idealStep, maxShift / maxIndexOffset) : idealStep;

        const indexOffset = idx - maxIndexOffset;
        const isPositiveSlope = [1, 2, 7, 8].includes(layout.signIdx);

        if (isPositiveSlope) {
          baseX = layout.planetsX + indexOffset * step;
          baseY = layout.planetsY + indexOffset * step;
        } else {
          baseX = layout.planetsX + indexOffset * step;
          baseY = layout.planetsY - indexOffset * step;
        }
      } else {
        const isDense = count >= 4;
        if (isDense) {
          const cols = count >= 5 ? 3 : 2;
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const totalRows = Math.ceil(count / cols);
          const colSpacing = 12;
          const rowSpacing = 13;
          const startX = layout.planetsX - ((cols - 1) * colSpacing) / 2;
          const startY = layout.planetsY - ((totalRows - 1) * rowSpacing) / 2;
          baseX = startX + col * colSpacing;
          baseY = startY + row * rowSpacing;
        } else {
          baseY = layout.planetsY + idx * 13 - ((count - 1) * 13) / 2;
        }
      }

      houseCoords.push({ name: itemName, x: baseX, y: baseY });
    });

    const hasCollision = houseCoords.some(
      (coord) => Math.abs(coord.x - layout.numX) < 22 && Math.abs(coord.y - layout.numY) < 16
    );

    const shift = hasCollision ? getGroupShift(layout.signIdx) : { dx: 0, dy: 0 };

    houseCoords.forEach((coord) => {
      const nudge = state.planet_nudges?.[coord.name] || { dx: 0, dy: 0 };
      coords[coord.name] = {
        x: coord.x + shift.dx + nudge.dx,
        y: coord.y + shift.dy + nudge.dy
      };
    });
  });

  return coords;
}

export default function CreateReportPage() {
  const [formValue, setFormValue] = useState<ReportInput>(initialValue);
  const [reportState, setReportState] = useState<ReportState | null>(null);
  const [activePlanet, setActivePlanet] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [compiledPdfUrl, setCompiledPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [showBirthDetails, setShowBirthDetails] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState("");

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

  const fullPdfUrl = useMemo(() => (pdfUrl ? (pdfUrl.startsWith("blob:") ? pdfUrl : `${process.env.NEXT_PUBLIC_API_URL || "https://astro-freelance.onrender.com"}${pdfUrl}`) : ""), [pdfUrl]);

  // Load the initial calculation from backend into central state
  async function handleLoadDetails(overrideValue?: ReportInput) {
    setLoading(true);
    setError("");
    setPdfUrl("");
    try {
      const activeFormValue = overrideValue || formValue;
      const state = await calculateReport(buildRequestPayload(activeFormValue, null));

      // Determine default active planet
      const activeDasha = state.dasha_list.find((d) => d.is_active);
      setActivePlanet(activeDasha ? activeDasha.planet : state.dasha_list[0].planet);

      // Collapse the form automatically upon loading
      setShowBirthDetails(false);

      const stateWithCoords: ReportState = {
        ...state,
        true_node: activeFormValue.true_node ?? true,
        planet_overrides: buildPlanetOverrides(state.shorthand_planets),
      };

      const planet_coords = calculatePlanetCoords(stateWithCoords);
      stateWithCoords.planet_coords = planet_coords;

      setReportState(stateWithCoords);

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

  // Render the PDF from the current edited ReportState
  async function handleRenderPdf() {
    if (!reportState) return;
    setRendering(true);
    setError("");
    try {
      const requestPayload = buildRequestPayload(formValue, reportState);
      const recalculatedState = await calculateReport(requestPayload);

      const activePlanetVal = activePlanet || (recalculatedState.dasha_list.find((d) => d.is_active)?.planet || recalculatedState.dasha_list[0].planet);
      const orderedAntardashas = [
        ...recalculatedState.antardasha_list.filter((g) => groupKey(g) === activePlanetVal),
        ...recalculatedState.antardasha_list.filter((g) => groupKey(g) !== activePlanetVal),
      ];

      const stateToRender: ReportState = {
        ...recalculatedState,
        true_node: requestPayload.true_node ?? recalculatedState.true_node ?? true,
        planet_overrides: requestPayload.planet_overrides ?? buildPlanetOverrides(recalculatedState.shorthand_planets),
        antardasha_list: orderedAntardashas,
        show_kundli: reportState.show_kundli,
        show_mahadasha: reportState.show_mahadasha,
        show_antardasha: reportState.show_antardasha,
        show_lucky_info: reportState.show_lucky_info,
        planet_nudges: reportState.planet_nudges,
      };

      const planet_coords = calculatePlanetCoords(stateToRender);
      stateToRender.planet_coords = planet_coords;

      setReportState(stateToRender);

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
      customer: { ...reportState.customer, [field]: normalizeEditorInput(val) },
    });
  };

  const updateSummaryField = (field: keyof AstrologyState, val: any) => {
    if (!reportState) return;
    setReportState({
      ...reportState,
      summary: {
        ...reportState.summary,
        [field]: typeof val === "string" ? normalizeEditorInput(val) : val,
      },
    });
  };

  const updateDashaField = (index: number, field: keyof DashaRow, val: any) => {
    if (!reportState) return;
    const newDashas = [...reportState.dasha_list];
    newDashas[index] = {
      ...newDashas[index],
      [field]: typeof val === "string" ? normalizeEditorInput(val) : val,
    };
    setReportState({
      ...reportState,
      dasha_list: newDashas,
    });
  };

  const updateAntardashaField = (subperiodIdx: number, field: "lord_bn" | "start" | "end", val: string) => {
    if (!reportState || !activePlanet) return;
    const nextAntardashas = reportState.antardasha_list.map((group) => {
      if (groupKey(group) === activePlanet) {
        const nextSubperiods = [...group.subperiods];
        nextSubperiods[subperiodIdx] = {
          ...nextSubperiods[subperiodIdx],
          [field]: normalizeEditorInput(val),
        };
        return { ...group, subperiods: nextSubperiods };
      }
      return group;
    });
    setReportState({
      ...reportState,
      antardasha_list: nextAntardashas,
    });
  };

  const updateShorthandPlanet = (planetName: string, field: "display" | "compact_indexed", val: string) => {
    if (!reportState) return;
    const nextShorthands = [...reportState.shorthand_planets];
    const planetIndex = nextShorthands.findIndex((planet) => planet.full === planetName);
    if (planetIndex < 0) return;
    nextShorthands[planetIndex] = { ...nextShorthands[planetIndex], [field]: normalizeEditorInput(val) };
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

  const updateToggle = (field: "show_kundli" | "show_mahadasha" | "show_antardasha" | "show_lucky_info", val: boolean) => {
    if (!reportState) return;
    setReportState({
      ...reportState,
      [field]: val,
    });
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
      const newCompact = `${toBengaliDigits(String(targetSignIdx))} | ১৫° ০০′ ০০″`;
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
      const newCompact = `${toBengaliDigits(String(targetSignIdx))} | ১৫° ০০′ ০০″`;
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
    <main className="min-h-screen flex flex-col justify-start relative" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif", background: "#f7f5f0", color: "#334155" }}>

      {/* ── Background Decorative Mandalas ── */}
      <div className="absolute top-0 left-0 w-[30vw] h-[30vw] min-w-[15rem] min-h-[15rem] bg-amber-100 opacity-20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[30vw] h-[30vw] min-w-[15rem] min-h-[15rem] bg-red-100 opacity-20 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* ── Header / Branding ── */}
      <header className="no-print w-full py-3 px-3 sm:px-6 border-b flex items-center justify-between shadow-sm z-30" style={{ borderColor: "#ebdcb9", background: "#fdfcf7" }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md" style={{ background: "#92400e" }}>
            🕉️
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight" style={{ color: "#1a365d" }}>Astro Freelance Workspace</h1>
            <p className="hidden sm:block text-xs font-medium" style={{ color: "rgba(146, 64, 14, 0.8)" }}>Kaka Babu&apos;s Digital Astrology Board</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {reportState && (
            <Link
              href="/"
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
              onClick={handleRenderPdf}
              disabled={rendering}
              id="btn-update-pdf"
              className="flex items-center gap-1.5 text-[0.6875rem] sm:text-xs font-semibold px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg shadow-sm transition-all disabled:opacity-60 text-white"
              style={{ background: "linear-gradient(135deg, #800020, #590219)" }}
            >
              {rendering && <LoadingSpinner />}
              <span className="hidden sm:inline">{rendering ? "Updating..." : "Update & Refresh Preview"}</span>
              <span className="inline sm:hidden">{rendering ? "Updating..." : "Update"}</span>
            </button>
          )}
          <div className="text-[0.6875rem] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-2 border" style={{ background: "#fffbeb", color: "#78350f", borderColor: "#ebdcb9" }}>
            <i className="fa-solid fa-circle text-emerald-500 animate-pulse" style={{ fontSize: "10px" }}></i>
            <span className="hidden sm:inline">Active Session</span>
            <span className="inline sm:hidden">Active</span>
          </div>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm flex items-center gap-2 z-20">
          <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* ── MAIN INTERACTIVE FLOW ── */}
      <div className="flex-1 flex flex-col relative w-full md:overflow-hidden">

        {/* ═══ WORKSPACE (Two-column editor + preview) ═══ */}
        <div
          className="flex-1 w-full flex flex-col md:flex-row md:overflow-hidden transition-workspace"
        >
          {/* ── LEFT COLUMN: Interactive Visual Editor ── */}
          <section className="w-full md:w-[42%] flex flex-col md:overflow-y-auto overflow-visible border-b md:border-b-0 md:border-r border-[#ebdcb9]" style={{ background: "white" }}>

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
                        { label: "Rashi", field: "rashi" as const },
                        { label: "Lagna", field: "lagna" as const },
                        { label: "Nakshatra", field: "nakshatra" as const },
                        { label: "Pada", field: "pada" as const },
                        { label: "Gan", field: "gan" as const },
                        { label: "Varna", field: "varna" as const },
                      ].map(({ label, field }) => (
                        <div key={field} className="flex items-center gap-1 text-[0.625rem]">
                          <span className="font-semibold text-slate-500 shrink-0">{label}:</span>
                          <input
                            className="rounded px-1 py-0.5 w-full focus:bg-white focus:outline-none text-[0.6875rem]"
                            style={{ border: "1px solid #e2e8f0", background: "rgba(248, 250, 252, 0.5)" }}
                            value={toEnglishDigits((reportState.summary as any)[field])}
                            onChange={(e) => {
                              updateSummaryField(field, e.target.value);
                              if (field === "pada") updateSummaryField("nakshatra_pada", e.target.value);
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Lucky Info */}
                    <div className={`mt-3 p-2 rounded grid gap-2 transition-opacity ${!reportState.show_lucky_info ? "opacity-30 pointer-events-none" : ""}`} style={{ border: "1px solid #fef3c7", background: "rgba(255, 251, 235, 0.4)" }}>
                      {[
                        { label: "Lucky Day", field: "shubh_bar" as const },
                        { label: "Lucky Color", field: "shubh_rong" as const },
                        { label: "Lucky Number", field: "shubh_sonkha" as const },
                      ].map(({ label, field }) => (
                        <div key={field} className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 w-20 shrink-0 text-[0.625rem]">{label}:</span>
                          <input
                            className="px-1 py-0.5 rounded w-full focus:outline-none text-[0.6875rem]"
                            style={{ border: "1px solid #e2e8f0", background: "white" }}
                            value={toEnglishDigits((reportState.summary as any)[field])}
                            onChange={(e) => updateSummaryField(field, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex flex-col text-[0.59375rem]">
                        <span className="font-semibold text-slate-500">Lucky Name Letter</span>
                        <input
                          className="rounded px-1 py-0.5 w-full focus:bg-white focus:outline-none text-[0.6875rem]"
                          style={{ border: "1px solid #e2e8f0", background: "rgba(248, 250, 252, 0.5)" }}
                          value={toEnglishDigits(reportState.summary.current_pada_syllable)}
                          onChange={(e) => { updateSummaryField("current_pada_syllable", e.target.value); updateSummaryField("namer_adokkhyor", e.target.value); }}
                        />
                      </div>
                      <div className="flex flex-col text-[0.59375rem]">
                        <span className="font-semibold text-slate-500">Nakshatra Lord</span>
                        <input
                          className="rounded px-1 py-0.5 w-full focus:bg-white focus:outline-none text-[0.6875rem]"
                          style={{ border: "1px solid #e2e8f0", background: "rgba(248, 250, 252, 0.5)" }}
                          value={toEnglishDigits(reportState.summary.nakshatra_lord)}
                          onChange={(e) => updateSummaryField("nakshatra_lord", e.target.value)}
                        />
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
                  <div className={`transition-opacity duration-200 ${!reportState.show_kundli ? "opacity-30" : ""}`}>
                    <svg viewBox="0 0 300 300" className="w-full max-w-[17rem] aspect-square stroke-slate-700 rounded-lg shadow-sm mx-auto" style={{ background: "#faf5ff", border: "1px solid #e2e8f0" }}>
                      {/* Outer Border */}
                      <rect x="0" y="0" width="300" height="300" fill="#faf5ff" stroke="#a78bfa" strokeWidth="2.5" rx="8" />

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

                      {/* Center Square decoration */}
                      <rect x="101" y="101" width="98" height="98" fill="#f3e8ff" stroke="none" />
                      <text x="150" y="155" textAnchor="middle" stroke="none" className="text-[0.75rem] font-black fill-purple-900 tracking-wider select-none">
                        রাশি চক্র
                      </text>

                      {(() => {
                        const houseLayout = [
                          { numX: 150, numY: 85, planetsX: 150, planetsY: 50, poly: "100,100 200,100 150,0", signIdx: 0 },
                          { numX: 78, numY: 45, planetsX: 65, planetsY: 35, poly: "0,0 100,0 100,100", signIdx: 1 },
                          { numX: 22, numY: 80, planetsX: 30, planetsY: 50, poly: "0,0 0,100 100,100", signIdx: 2 },
                          { numX: 50, numY: 185, planetsX: 60, planetsY: 150, poly: "100,100 100,200 0,150", signIdx: 3 },
                          { numX: 22, numY: 225, planetsX: 45, planetsY: 245, poly: "0,200 0,300 100,300", signIdx: 4 },
                          { numX: 78, numY: 280, planetsX: 65, planetsY: 245, poly: "100,200 100,300 0,300", signIdx: 5 },
                          { numX: 150, numY: 285, planetsX: 150, planetsY: 220, poly: "100,200 200,200 150,300", signIdx: 6 },
                          { numX: 222, numY: 280, planetsX: 235, planetsY: 245, poly: "200,200 200,300 300,300", signIdx: 7 },
                          { numX: 278, numY: 225, planetsX: 255, planetsY: 245, poly: "300,200 300,300 200,300", signIdx: 8 },
                          { numX: 250, numY: 185, planetsX: 240, planetsY: 150, poly: "200,100 200,200 300,150", signIdx: 9 },
                          { numX: 222, numY: 30, planetsX: 245, planetsY: 45, poly: "200,0 300,0 200,100", signIdx: 11 },
                          { numX: 278, numY: 80, planetsX: 255, planetsY: 60, poly: "300,0 200,100 300,100", signIdx: 10 }
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
                                const items: string[] = [];
                                if (layout.signIdx === lagnaIdx) {
                                  items.push("ল");
                                }
                                if (house && house.planets) {
                                  items.push(...house.planets);
                                }

                                const isDense = items.length >= 5;
                                const textSize = isDense ? "text-[0.6875rem]" : "text-[0.8125rem]";

                                return items.map((itemName, idx) => {
                                  const coords = finalCoords[itemName];
                                  if (!coords) return null;
                                  const isSelected = selectedPlanet === itemName;
                                  const isLagna = itemName === "ল";

                                  return (
                                    <text
                                      key={idx}
                                      x={coords.x}
                                      y={coords.y}
                                      textAnchor="middle"
                                      stroke="none"
                                      className={isLagna ? (
                                        `${textSize} font-normal cursor-pointer select-none transition-all ${isSelected ? "fill-amber-500 text-[1.0625rem] animate-pulse" : "fill-red-600 hover:fill-red-500"
                                        }`
                                      ) : (
                                        `${textSize} font-black cursor-pointer select-none transition-all ${isSelected ? "fill-amber-500 text-[1.0625rem] animate-pulse" : "fill-indigo-950 hover:fill-indigo-650"
                                        }`
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPlanet(isSelected ? "" : itemName);
                                      }}
                                      {...(!isLagna ? ({ draggable: true } as any) : {})}
                                      onDragStart={(e) => {
                                        if (isLagna) return;
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", itemName);
                                        setSelectedPlanet(itemName);
                                      }}
                                    >
                                      {itemName}
                                    </text>
                                  );
                                });
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                              onClick={() => setActivePlanet(dasha.planet)}
                            >
                              <td className="px-1 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                                <input type="radio" name="activeDasha" checked={activePlanet === dasha.planet} onChange={() => setActivePlanet(dasha.planet)}
                                  className="text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" />
                              </td>
                              <td className="px-1 py-1">
                                <input className="bg-transparent border-0 p-0 w-[3.5rem] font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
                                  value={toEnglishDigits(dasha.planet_bn)} onChange={(e) => updateDashaField(idx, "planet_bn", e.target.value)} onClick={(e) => e.stopPropagation()} />
                              </td>
                              <td className="px-1 py-1 text-center">
                                <input className="bg-transparent border-0 p-0 w-[2rem] text-center font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
                                  value={toEnglishDigits(dasha.years)} onChange={(e) => updateDashaField(idx, "years", e.target.value)} onClick={(e) => e.stopPropagation()} />
                              </td>
                              <td className="px-1 py-1">
                                <input className="bg-transparent border-0 p-0 w-[4rem] focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
                                  value={toEnglishDigits(dasha.start)} onChange={(e) => updateDashaField(idx, "start", e.target.value)} onClick={(e) => e.stopPropagation()} />
                              </td>
                              <td className="px-1 py-1">
                                <input className="bg-transparent border-0 p-0 w-[4rem] focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5 text-[0.6875rem]"
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
                      <label className="flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800 text-[0.5625rem]">
                        <input type="checkbox" checked={!!reportState.show_antardasha} onChange={(e) => updateToggle("show_antardasha", e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer" style={{ borderColor: "#cbd5e1" }} />
                        <span>Show PDF</span>
                      </label>
                    </div>
                    <div className="overflow-x-auto select-none">
                      <table className="min-w-full text-left text-[0.625rem]">
                        <thead>
                          <tr className="font-bold border-b" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                            <th className="px-1 py-0.5">Maha / Antar</th>
                            <th className="px-1 py-0.5">Start</th>
                            <th className="px-1 py-0.5">End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const displayRows = reportState.antardasha_display_rows ?? [];
                            if (!displayRows.length) {
                              return (
                                <tr>
                                  <td colSpan={3} className="px-2 py-4 text-center text-slate-400 italic">
                                    No antardasha rows available for the selected report date.
                                  </td>
                                </tr>
                              );
                            }
                            return displayRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-amber-50/30">
                                <td className="px-1 py-1">
                                  <span className="font-semibold text-slate-400 mr-1 text-[0.625rem]">
                                    {toEnglishDigits(row.major_bn)} /
                                  </span>
                                  <span className="font-medium text-slate-700 text-[0.6875rem]">{toEnglishDigits(row.lord_bn)}</span>
                                </td>
                                <td className="px-1 py-1">
                                  <span className="text-slate-700 text-[0.6875rem]">{toEnglishDigits(row.start)}</span>
                                </td>
                                <td className="px-1 py-1">
                                  <span className="text-slate-700 text-[0.6875rem]">{toEnglishDigits(row.end)}</span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Bottom Update Button */}
                <div className="flex items-center justify-between gap-4 p-4 -mx-4 -mb-4 rounded-b-lg" style={{ background: "rgba(255, 251, 235, 0.6)", borderTop: "1px solid #ebdcb9" }}>
                  <div className="text-slate-500 leading-normal max-w-[16.25rem] text-[0.6875rem]">
                    Modifications exist in local memory. Click update to compile PDF with current configurations.
                  </div>
                  <button
                    onClick={handleRenderPdf}
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
          <section className="w-full md:w-[58%] flex flex-col h-auto md:h-full md:overflow-y-auto overflow-visible items-center p-4 relative border-t md:border-t-0 md:border-l border-[#e2e8f0] bg-[#f1f5f9]">

            {/* Floating Controls Bar */}
            <div className="w-full max-w-5xl rounded-xl shadow-md p-3 mb-4 flex items-center justify-between z-10 sticky top-0 no-print" style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(8px)", border: "1px solid #ebdcb9" }}>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <i className="fa-solid fa-file-pdf" style={{ color: "#800020" }}></i> Live Report Preview
              </span>
              <div className="flex items-center gap-2">
                {fullPdfUrl && (
                  <>
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

                        // If compiled PDF URL is missing or points to undefined (older backend), fall back to print
                        if (!compiledPdfUrl || compiledPdfUrl.endsWith("undefined")) {
                          const iframe = document.querySelector("iframe");
                          if (iframe && iframe.contentWindow) {
                            const originalTitle = document.title;
                            document.title = filename.replace(".pdf", "");
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            setTimeout(() => { document.title = originalTitle; }, 1000);
                          }
                          return;
                        }

                        setRendering(true);
                        try {
                          // Extract the filename from the compiledPdfUrl path
                          const urlParts = compiledPdfUrl.split("/");
                          const pdfFilename = urlParts[urlParts.length - 1];

                          // Build the download link pointing to our download helper endpoint
                          const downloadUrl = `${API}/api/download-pdf/${pdfFilename}?name=${encodeURIComponent(filename)}`;
                          
                          // Trigger native browser download directly via dynamic link navigation
                          const a = document.createElement("a");
                          a.href = downloadUrl;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        } catch (err) {
                          console.error("Direct PDF download failed, falling back to iframe print", err);
                          const iframe = document.querySelector("iframe");
                          if (iframe && iframe.contentWindow) {
                            const originalTitle = document.title;
                            document.title = filename.replace(".pdf", "");
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            setTimeout(() => { document.title = originalTitle; }, 1000);
                          }
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
            <div className="w-full max-w-5xl rounded-xl relative overflow-hidden bg-[#f1f5f9] border border-[#e2e8f0] h-[320mm]">
              {rendering && (
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
        </div>
      </div>
    </main>
  );
}
