"use client";

import { useEffect, useMemo, useState } from "react";

import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PdfViewer } from "../../components/PdfViewer";
import { ReportForm } from "../../components/ReportForm";
import { calculateReport, renderPdf } from "../../services/api";
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
    ...(formValue.planet_overrides || {}) // Drag & Drop হওয়া সর্বশেষ পজিশনকে প্রাধান্য দেওয়া হবে
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

  const fullPdfUrl = useMemo(() => (pdfUrl ? (pdfUrl.startsWith("blob:") ? pdfUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${pdfUrl}`) : ""), [pdfUrl]);

  // Load the initial calculation from backend into central state
  async function handleLoadDetails() {
    setLoading(true);
    setError("");
    setPdfUrl("");
    try {
      const state = await calculateReport(buildRequestPayload(formValue, null));

      // Determine default active planet
      const activeDasha = state.dasha_list.find((d) => d.is_active);
      setActivePlanet(activeDasha ? activeDasha.planet : state.dasha_list[0].planet);

      // Collapse the form automatically upon loading
      setShowBirthDetails(false);

      const stateWithCoords: ReportState = {
        ...state,
        true_node: formValue.true_node ?? true,
        planet_overrides: buildPlanetOverrides(state.shorthand_planets),
      };

      const planet_coords = calculatePlanetCoords(stateWithCoords);
      stateWithCoords.planet_coords = planet_coords;

      setReportState(stateWithCoords);

      // Immediately render default PDF
      const result = await renderPdf(stateWithCoords);
      setPdfUrl(result.pdf_url);
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
      setPdfUrl(result.pdf_url);
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

    // গ্রহের নাম অনুযায়ী ব্যাকএন্ডের জন্য Shorthand এবং Overrides আপডেট করা
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Premium Navbar */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-400">
              Astro FreeLance Workspace
            </h1>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              Professional Astrological Report System — WYSIWYG Editor with dynamic subperiod loaders
            </p>
          </div>
          <div className="flex items-center gap-2">
            {reportState && (
              <button
                onClick={handleRenderPdf}
                disabled={rendering}
                id="btn-update-pdf"
                className="bg-amber-500 text-slate-950 px-4 py-2 rounded font-semibold text-sm shadow hover:bg-amber-400 transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {rendering && <LoadingSpinner />}
                {rendering ? "Updating PDF..." : "Update & Refresh Preview"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 xl:px-8 py-6 flex flex-col gap-6">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {/* SECTION 1: BIRTH DETAILS (Collapsible) */}
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBirthDetails(!showBirthDetails)}
            className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100/70 transition-all focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                1. Birth Details
              </h2>
              {reportState && (
                <span className="text-xs text-slate-500 font-medium">
                  ({reportState.customer.name} • {reportState.customer.dob} • {reportState.customer.time} • {reportState.customer.place})
                </span>
              )}
            </div>
            <span className="text-xs text-indigo-650 font-semibold flex items-center gap-1">
              {showBirthDetails ? "Collapse" : "Expand / Edit"}
              <svg className={`w-4 h-4 transform transition-transform ${showBirthDetails ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {showBirthDetails && (
            <div className="p-5 border-t border-slate-200 bg-white">
              <ReportForm value={formValue} onChange={setFormValue} onSubmit={handleLoadDetails} loading={loading} />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* SECTION 2: WYSIWYG Document Editor */}
          <section className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 flex flex-col min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center justify-between">
              <span>2. Visual Editor Sheet</span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal uppercase tracking-wider">
                Interactive
              </span>
            </h2>

            {!reportState ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 min-h-[300px]">
                <svg width="40" height="40" className="h-10 w-10 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p className="text-sm font-medium">No active report loaded.</p>
                <p className="text-xs mt-1 max-w-[200px]">Fill in the birth details form above and load details to begin editing.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Visual A4 Sheet Preview Mock */}
                <div className="flex-1 bg-white border border-slate-300 rounded p-4 text-[11px] font-sans text-slate-900 leading-relaxed shadow-inner flex flex-col gap-4 max-h-[75vh] overflow-y-auto min-w-0 select-text w-full mx-auto">

                  {/* Sheet Header */}
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between relative px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">No:</span>
                      <input
                        className="bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-700 w-24 focus:bg-white focus:outline-none"
                        value={toEnglishDigits(reportState.report_no)}
                        onChange={(e) => setReportState({ ...reportState, report_no: normalizeEditorInput(e.target.value) })}
                      />
                    </div>
                    <h3 className="text-xl font-extrabold text-red-600 tracking-wide text-center">জীবন জিজ্ঞাসা</h3>
                    <div className="w-10 h-10 flex items-center justify-center">
                      <svg width="30" height="30" viewBox="0 0 40 40" className="stroke-indigo-650 stroke-[1.5]">
                        <polygon points="20,0 40,20 20,40 0,20" fill="none" />
                        <line x1="0" y1="20" x2="40" y2="20" />
                        <line x1="20" y1="0" x2="20" y2="40" />
                      </svg>
                    </div>
                  </div>

                  {/* Customer Info Grid Row */}
                  <div className="grid grid-cols-3 border border-slate-800 divide-x divide-slate-800 text-[10px] bg-slate-50/30">
                    <div className="p-2 flex flex-col gap-1">
                      <span className="font-semibold text-indigo-800 text-[11px]">Astrologer: S. Ghosh</span>
                      <span className="text-slate-500 leading-tight">Jyotish Samrat, Gold Medalist<br />(M.A), M.B.P.P</span>
                      <span className="text-slate-600 font-medium mt-1">Mobile: 9153087870<br />9732830353</span>
                    </div>

                    <div className="p-2 col-span-2 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-20">Name:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full font-bold text-slate-850"
                          value={toEnglishDigits(reportState.customer.name)}
                          onChange={(e) => updateCustomerField("name", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-20">Father's Name:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                          value={toEnglishDigits(reportState.customer.father_name)}
                          onChange={(e) => updateCustomerField("father_name", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500 w-20">DOB:</span>
                          <input
                            className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                            value={toEnglishDigits(reportState.customer.dob)}
                            onChange={(e) => updateCustomerField("dob", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500 w-20">Birth Time:</span>
                          <input
                            className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                            value={toEnglishDigits(reportState.customer.time)}
                            onChange={(e) => updateCustomerField("time", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500 w-20">Weekday:</span>
                          <input
                            className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                            value={toEnglishDigits(reportState.customer.weekday)}
                            onChange={(e) => updateCustomerField("weekday", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500 w-20">Mobile:</span>
                          <input
                            className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                            value={toEnglishDigits(reportState.customer.mobile)}
                            onChange={(e) => updateCustomerField("mobile", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500 w-20">Birth Place:</span>
                          <input
                            className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                            value={toEnglishDigits(reportState.customer.place)}
                            onChange={(e) => updateCustomerField("place", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500 w-20">Date:</span>
                          <input
                            className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                            value={toEnglishDigits(reportState.generated_at)}
                            onChange={(e) => setReportState({ ...reportState, generated_at: normalizeEditorInput(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mid Row: Planet lists, Kundli Chakra, Summary info */}
                  <div className="grid grid-cols-[180px_280px_1fr] border border-slate-800 divide-x divide-slate-800 text-[10px]">

                    {/* Left Col: Planets display Input Grid (Width Fixed to prevent cut-off) */}
                    <div className="p-2 flex flex-col gap-1.5 w-full">
                      <span className="font-bold text-indigo-800 text-[11px] border-b border-slate-200 pb-0.5 mb-0.5">
                        গ্রহাবস্থান (Planetary Positions)
                      </span>
                      <div className="grid gap-1.5 w-full">
                        {sortedShorthandPlanets.map((pl) => (
                          <div key={pl.full} className="grid grid-cols-[65px_1fr_auto] gap-2 items-center w-full">
                            <span className="font-bold text-slate-700 text-[11px] shrink-0 text-right pr-1 whitespace-nowrap" title={pl.full}>
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
                              className="border border-amber-200 bg-amber-50/70 px-1 py-0.5 rounded text-[11px] w-full font-bold tracking-wide text-indigo-950 shadow-sm focus:bg-white focus:outline-none focus:border-indigo-500"
                              value={toEnglishDigits(pl.compact_indexed ?? pl.compact ?? "")}
                              onChange={(e) => updateShorthandPlanet(pl.full, "compact_indexed", e.target.value)}
                            />
                            <div className="flex gap-0.5 pl-1 shrink-0 w-fit">
                              {pl.is_retrograde && <span title="Retrograde" className="select-none text-[10px] text-amber-600 font-bold">(R)</span>}
                              {pl.is_combust && <span title="Combust" className="select-none text-[10px] text-red-500 font-bold">(C)</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Center Col: Kundli Chakra SVG with layout toggle */}
                    <div className="p-2 flex flex-col items-center">
                      <div className="w-full flex items-center justify-between border-b border-slate-200 pb-0.5 mb-1.5">
                        <span className="font-bold text-slate-800 text-[11px]">Rashi Chakra</span>
                        <label className="flex items-center gap-1 cursor-pointer text-[9px] text-slate-500 hover:text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!reportState.show_kundli}
                            onChange={(e) => updateToggle("show_kundli", e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                          />
                          <span>Show PDF</span>
                        </label>
                      </div>

                      {selectedPlanet && (
                        <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-[10px] text-amber-800 font-semibold mb-1">
                          <span>Selected: <strong className="text-amber-600">{selectedPlanet}</strong> — click house to move or use arrow keys / pad to nudge</span>
                          <button
                            onClick={() => setSelectedPlanet("")}
                            className="text-amber-500 hover:text-amber-700 font-bold text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className={`transition-opacity duration-200 ${!reportState.show_kundli ? "opacity-30" : ""}`}>
                        <svg width="270" height="270" viewBox="0 0 300 300" className="stroke-slate-700 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
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
                          <text x="150" y="155" textAnchor="middle" stroke="none" className="text-xs font-black fill-purple-900 tracking-wider select-none">
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

                                  <text x={layout.numX} y={layout.numY} textAnchor="middle" fill="#9333ea" stroke="none" className="text-[13px] font-extrabold select-none pointer-events-none">
                                    {currentHouseBn}
                                  </text>
                                  {(() => {
                                    const items = [];
                                    if (layout.signIdx === lagnaIdx) {
                                      items.push("ল");
                                    }
                                    if (house && house.planets) {
                                      items.push(...house.planets);
                                    }

                                    const isDense = items.length >= 5;
                                    const textSize = isDense ? "text-[11px]" : "text-[13px]";

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
                                            `${textSize} font-normal cursor-pointer select-none transition-all ${isSelected ? "fill-amber-500 text-[17px] animate-pulse" : "fill-red-600 hover:fill-red-500"
                                            }`
                                          ) : (
                                            `${textSize} font-black cursor-pointer select-none transition-all ${isSelected ? "fill-amber-500 text-[17px] animate-pulse" : "fill-indigo-950 hover:fill-indigo-650"
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

                      {selectedPlanet && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center gap-1 select-none">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Nudge Controls
                          </span>
                          <div className="grid grid-cols-3 gap-1 w-20 h-20 items-center justify-center">
                            <div />
                            <button
                              type="button"
                              onClick={() => nudgeSelectedPlanet(0, -2)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors"
                              title="Nudge Up"
                            >
                              ▲
                            </button>
                            <div />
                            <button
                              type="button"
                              onClick={() => nudgeSelectedPlanet(-2, 0)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors"
                              title="Nudge Left"
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReportState(prev => {
                                  if (!prev) return prev;
                                  const nudges = prev.planet_nudges || {};
                                  return {
                                    ...prev,
                                    planet_nudges: {
                                      ...nudges,
                                      [selectedPlanet]: { dx: 0, dy: 0 }
                                    }
                                  };
                                });
                              }}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold p-1 rounded border border-amber-200 flex items-center justify-center h-6 w-6 text-[10px] transition-colors"
                              title="Reset Offset"
                            >
                              ⟲
                            </button>
                            <button
                              type="button"
                              onClick={() => nudgeSelectedPlanet(2, 0)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors"
                              title="Nudge Right"
                            >
                              ▶
                            </button>
                            <div />
                            <button
                              type="button"
                              onClick={() => nudgeSelectedPlanet(0, 2)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-1 rounded border border-indigo-200 flex items-center justify-center h-6 w-6 text-xs transition-colors"
                              title="Nudge Down"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Col: Summary & Lucky Info */}
                    <div className="p-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-0.5">
                        <span className="font-bold text-indigo-800 text-[11px]">Kundli Summary</span>
                        <label className="flex items-center gap-1 cursor-pointer text-[9px] text-slate-500 hover:text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!reportState.show_lucky_info}
                            onChange={(e) => updateToggle("show_lucky_info", e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                          />
                          <span>Show Lucky</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 shrink-0">Rashi:</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.rashi)}
                            onChange={(e) => updateSummaryField("rashi", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 shrink-0">Lagna:</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.lagna)}
                            onChange={(e) => updateSummaryField("lagna", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 shrink-0">Nakshatra:</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.nakshatra)}
                            onChange={(e) => updateSummaryField("nakshatra", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 shrink-0">Pada:</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.pada)}
                            onChange={(e) => {
                              updateSummaryField("pada", e.target.value);
                              updateSummaryField("nakshatra_pada", e.target.value);
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 shrink-0">Gan:</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.gan)}
                            onChange={(e) => updateSummaryField("gan", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 shrink-0">Varna:</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.varna)}
                            onChange={(e) => updateSummaryField("varna", e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Lucky Info Sub-card */}
                      <div className={`p-1.5 rounded border border-amber-150 bg-amber-50/40 grid gap-1.5 transition-opacity ${!reportState.show_lucky_info ? "opacity-30 pointer-events-none" : ""}`}>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 w-16 shrink-0 text-[10px]">Lucky Day:</span>
                          <input
                            className="border border-slate-200 bg-white px-1 py-0.5 rounded text-[11px] w-full focus:outline-none"
                            value={toEnglishDigits(reportState.summary.shubh_bar)}
                            onChange={(e) => updateSummaryField("shubh_bar", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 w-16 shrink-0 text-[10px]">Lucky Color:</span>
                          <input
                            className="border border-slate-200 bg-white px-1 py-0.5 rounded text-[11px] w-full focus:outline-none"
                            value={toEnglishDigits(reportState.summary.shubh_rong)}
                            onChange={(e) => updateSummaryField("shubh_rong", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-500 w-16 shrink-0 text-[10px]">Lucky Number:</span>
                          <input
                            className="border border-slate-200 bg-white px-1 py-0.5 rounded text-[11px] w-full focus:outline-none"
                            value={toEnglishDigits(reportState.summary.shubh_sonkha)}
                            onChange={(e) => updateSummaryField("shubh_sonkha", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex flex-col text-[9.5px]">
                          <span className="font-semibold text-slate-500">Lucky Name Letter</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.current_pada_syllable)}
                            onChange={(e) => {
                              updateSummaryField("current_pada_syllable", e.target.value);
                              updateSummaryField("namer_adokkhyor", e.target.value);
                            }}
                          />
                        </div>
                        <div className="flex flex-col text-[9.5px]">
                          <span className="font-semibold text-slate-500">Nakshatra Lord</span>
                          <input
                            className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none"
                            value={toEnglishDigits(reportState.summary.nakshatra_lord)}
                            onChange={(e) => updateSummaryField("nakshatra_lord", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col text-[9.5px]">
                        <span className="font-semibold text-slate-500">Dasha Balance</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[11px] w-full focus:bg-white focus:outline-none font-bold"
                          value={toEnglishDigits(reportState.summary.dasha_balance)}
                          onChange={(e) => updateSummaryField("dasha_balance", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vimshottari Dasha & Antardasha Double Column */}
                  <div className="grid grid-cols-2 gap-4 text-[9px]">

                    {/* Mahadasha Table */}
                    <div className={`border border-slate-800 p-2 flex flex-col min-w-0 transition-opacity duration-200 ${!reportState.show_mahadasha ? "opacity-30" : ""}`}>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                        <span className="font-bold text-slate-800 text-[11px]">Vimshottari Dasha :</span>
                        <label className="flex items-center gap-1 cursor-pointer text-[9px] text-slate-500 hover:text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!reportState.show_mahadasha}
                            onChange={(e) => updateToggle("show_mahadasha", e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                          />
                          <span>Show PDF</span>
                        </label>
                      </div>

                      <div className="overflow-x-auto select-none">
                        <table className="min-w-full text-left text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-655 font-bold border-b border-slate-200">
                              <th className="px-1 py-0.5 text-center w-5">Active</th>
                              <th className="px-1 py-0.5">Dasha (Planet)</th>
                              <th className="px-1 py-0.5 text-center">Years</th>
                              <th className="px-1 py-0.5">Start</th>
                              <th className="px-1 py-0.5">End</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportState.dasha_list.map((dasha, idx) => (
                              <tr
                                key={idx}
                                className={`cursor-pointer hover:bg-indigo-50/40 transition-colors ${activePlanet === dasha.planet ? "bg-amber-50/80 font-bold text-slate-900" : "text-slate-700"
                                  }`}
                                onClick={() => setActivePlanet(dasha.planet)}
                              >
                                <td className="px-1 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="radio"
                                    name="activeDasha"
                                    checked={activePlanet === dasha.planet}
                                    onChange={() => setActivePlanet(dasha.planet)}
                                    className="text-indigo-650 focus:ring-0 h-3 w-3 cursor-pointer"
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="bg-transparent border-0 p-0 text-[11px] w-14 font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(dasha.planet_bn)}
                                    onChange={(e) => updateDashaField(idx, "planet_bn", e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-1 py-1 text-center">
                                  <input
                                    className="bg-transparent border-0 p-0 text-[11px] w-8 text-center font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(dasha.years)}
                                    onChange={(e) => updateDashaField(idx, "years", e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="bg-transparent border-0 p-0 text-[11px] w-16 focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(dasha.start)}
                                    onChange={(e) => updateDashaField(idx, "start", e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="bg-transparent border-0 p-0 text-[11px] w-16 focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(dasha.end)}
                                    onChange={(e) => updateDashaField(idx, "end", e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Antardasha Table */}
                    <div className={`border border-slate-800 p-2 flex flex-col min-w-0 transition-opacity duration-200 ${!reportState.show_antardasha ? "opacity-30" : ""}`}>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                        <span className="font-bold text-slate-800 text-[11px] truncate">
                          Antardasha: {toEnglishDigits(reportState.dasha_list.find((d) => d.planet === activePlanet)?.planet_bn || activePlanet)}
                        </span>
                        <label className="flex items-center gap-1 cursor-pointer text-[9px] text-slate-500 hover:text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!reportState.show_antardasha}
                            onChange={(e) => updateToggle("show_antardasha", e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                          />
                          <span>Show PDF</span>
                        </label>
                      </div>

                      <div className="overflow-x-auto select-none">
                        <table className="min-w-full text-left text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-655 font-bold border-b border-slate-200">
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
                                    <td colSpan={3} className="px-2 py-4 text-center text-slate-450 italic">
                                      No antardasha rows available for the selected report date.
                                    </td>
                                  </tr>
                                );
                              }
                              return displayRows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-50/50">
                                  <td className="px-1 py-1">
                                    <span className="text-[10px] font-semibold text-slate-400 mr-1">
                                      {toEnglishDigits(row.major_bn)} /
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-700">{toEnglishDigits(row.lord_bn)}</span>
                                  </td>
                                  <td className="px-1 py-1">
                                    <span className="text-[11px] text-slate-700">{toEnglishDigits(row.start)}</span>
                                  </td>
                                  <td className="px-1 py-1">
                                    <span className="text-[11px] text-slate-700">{toEnglishDigits(row.end)}</span>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Bottom Actions Row */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 bg-slate-50 -mx-5 -mb-5 p-5 rounded-b-lg">
                  <div className="text-[11px] text-slate-500 leading-normal max-w-[240px]">
                    All modifications exist in local memory. Click update to compile the PDF with tick mark configurations.
                  </div>
                  <button
                    onClick={handleRenderPdf}
                    disabled={rendering}
                    id="btn-update-pdf-bottom"
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-xs px-4 py-2.5 rounded shadow-sm transition-all disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {rendering && <LoadingSpinner />}
                    {rendering ? "Updating PDF..." : "Update & Refresh Preview"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: Live PDF Preview */}
          <section className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-col w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 px-2">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                3. Report Preview
              </h2>
              {fullPdfUrl && (
                <div className="flex gap-2">
                  <a
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1"
                    href={fullPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    id="btn-open-pdf"
                  >
                    Open View
                  </a>
                  <button
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      const iframe = document.querySelector("iframe");
                      if (iframe && iframe.contentWindow) {
                        const originalTitle = document.title;
                        document.title = "Print Astrological Report";
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => {
                          document.title = originalTitle;
                        }, 1000);
                      }
                    }}
                    id="btn-print-report"
                  >
                    Print Report
                  </button>
                  <button
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1 cursor-pointer"
                    onClick={async (e) => {
                      e.preventDefault();
                      const iframe = document.querySelector("iframe");
                      if (iframe && iframe.contentWindow) {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const element = iframeDoc?.querySelector(".a4-page") as HTMLElement;
                        if (!element) return;

                        const dobFormatted = formValue.dob
                          ? formValue.dob.split('-').reverse().join('.')
                          : "";
                        const filename = dobFormatted
                          ? `${formValue.name} (${dobFormatted}).pdf`
                          : `${formValue.name}.pdf`;

                        setRendering(true);
                        try {
                          const html2pdf = (await import("html2pdf.js")).default;
                          const opt = {
                            margin: 0,
                            filename: filename,
                            image: { type: "jpeg", quality: 0.98 },
                            html2canvas: {
                              scale: 2,
                              useCORS: true,
                              logging: false,
                            },
                            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                          } as const;
                          await html2pdf().set(opt).from(element).save();
                        } catch (err) {
                          console.error("Direct PDF download failed, falling back to print", err);
                          // Fallback to print method if html2pdf fails
                          const originalTitle = document.title;
                          document.title = filename.replace(".pdf", "");
                          iframe.contentWindow.focus();
                          iframe.contentWindow.print();
                          setTimeout(() => {
                            document.title = originalTitle;
                          }, 1000);
                        } finally {
                          setRendering(false);
                        }
                      }
                    }}
                    id="btn-download-pdf"
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[500px] lg:min-h-[70vh] bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
              {rendering && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-600 gap-3">
                  <LoadingSpinner />
                  <span className="text-xs font-medium tracking-wide">Compiling report preview...</span>
                </div>
              )}

              {fullPdfUrl ? (
                <PdfViewer pdfUrl={fullPdfUrl} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-2">
                  <svg width="48" height="48" className="h-12 w-12 text-slate-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium">No preview available</span>
                  <span className="text-[10px] text-slate-400 max-w-[200px]">Initial calculations must be loaded first before the PDF compiles.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
