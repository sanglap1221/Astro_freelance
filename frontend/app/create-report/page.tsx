"use client";

import { useMemo, useState } from "react";

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
};

const chartPositions = [
  { x: 100, y: 45, houseNo: 1 },
  { x: 50, y: 30, houseNo: 2 },
  { x: 30, y: 60, houseNo: 3 },
  { x: 50, y: 105, houseNo: 4 },
  { x: 30, y: 150, houseNo: 5 },
  { x: 50, y: 175, houseNo: 6 },
  { x: 100, y: 155, houseNo: 7 },
  { x: 150, y: 175, houseNo: 8 },
  { x: 175, y: 150, houseNo: 9 },
  { x: 150, y: 105, houseNo: 10 },
  { x: 175, y: 60, houseNo: 11 },
  { x: 150, y: 30, houseNo: 12 },
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
  const planetOverrides = reportState?.planet_overrides ?? (reportState ? buildPlanetOverrides(reportState.shorthand_planets) : formValue.planet_overrides ?? {});

  return {
    ...formValue,
    true_node: formValue.true_node ?? reportState?.true_node ?? true,
    planet_overrides: planetOverrides,
    override_moon_longitude: formValue.override_moon_longitude?.trim() || undefined,
  };
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

  const fullPdfUrl = useMemo(() => (pdfUrl ? `http://127.0.0.1:8000${pdfUrl}` : ""), [pdfUrl]);

  // Load the initial calculation from backend into central state
  async function handleLoadDetails() {
    setLoading(true);
    setError("");
    setPdfUrl("");
    try {
      const state = await calculateReport(buildRequestPayload(formValue, null));
      setReportState({
        ...state,
        true_node: formValue.true_node ?? true,
        planet_overrides: buildPlanetOverrides(state.shorthand_planets),
      });
      
      // Determine default active planet
      const activeDasha = state.dasha_list.find((d) => d.is_active);
      setActivePlanet(activeDasha ? activeDasha.planet : state.dasha_list[0].planet);

      // Collapse the form automatically upon loading
      setShowBirthDetails(false);

      // Immediately render default PDF
      const result = await renderPdf(state);
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
      };

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

  const updateHouseChartItem = (index: number, text: string) => {
    if (!reportState) return;
    const nextHouseChart = [...reportState.house_chart];
    const cleanPlanets = normalizeEditorInput(text)
      .split(/[,\s।]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    nextHouseChart[index] = {
      ...nextHouseChart[index],
      planets: cleanPlanets,
      planets_text: cleanPlanets.join("\n"),
    };
    setReportState({
      ...reportState,
      house_chart: nextHouseChart,
    });
  };

  const updateToggle = (field: "show_kundli" | "show_mahadasha" | "show_antardasha" | "show_lucky_info", val: boolean) => {
    if (!reportState) return;
    setReportState({
      ...reportState,
      [field]: val,
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

      <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col gap-6">
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
              <div className="flex-1 bg-white border border-slate-300 rounded p-4 text-[10px] font-sans text-slate-900 leading-relaxed shadow-inner flex flex-col gap-3.5 max-h-[66vh] overflow-y-auto min-w-0 select-text max-w-4xl w-full mx-auto">
                
                {/* Sheet Header */}
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between relative px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400">No:</span>
                    <input
                      className="bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 w-20 focus:bg-white focus:outline-none"
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
                <div className="grid grid-cols-3 border border-slate-800 divide-x divide-slate-800 text-[9px] bg-slate-50/30">
                  <div className="p-2 flex flex-col gap-1">
                    <span className="font-semibold text-indigo-800 text-[10px]">Astrologer: S. Ghosh</span>
                    <span className="text-slate-500 leading-tight">Jyotish Samrat, Gold Medalist<br />(M.A), M.B.P.P</span>
                    <span className="text-slate-600 font-medium mt-1">Mobile: 9153087870<br />9732830353</span>
                  </div>

                  <div className="p-2 col-span-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500 w-16">Name:</span>
                      <input
                        className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full font-bold text-slate-850"
                        value={toEnglishDigits(reportState.customer.name)}
                        onChange={(e) => updateCustomerField("name", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500 w-16">Father's Name:</span>
                      <input
                        className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                        value={toEnglishDigits(reportState.customer.father_name)}
                        onChange={(e) => updateCustomerField("father_name", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-16">DOB:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                          value={toEnglishDigits(reportState.customer.dob)}
                          onChange={(e) => updateCustomerField("dob", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-16">Birth Time:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                          value={toEnglishDigits(reportState.customer.time)}
                          onChange={(e) => updateCustomerField("time", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-16">Weekday:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                          value={toEnglishDigits(reportState.customer.weekday)}
                          onChange={(e) => updateCustomerField("weekday", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-16">Mobile:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                          value={toEnglishDigits(reportState.customer.mobile)}
                          onChange={(e) => updateCustomerField("mobile", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-16">Birth Place:</span>
                        <input
                          className="border-b border-dotted border-slate-400 bg-transparent px-1 focus:border-indigo-600 focus:outline-none w-full"
                          value={toEnglishDigits(reportState.customer.place)}
                          onChange={(e) => updateCustomerField("place", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500 w-16">Date:</span>
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
                <div className="grid grid-cols-3 border border-slate-800 divide-x divide-slate-800 text-[9px]">
                  
                  {/* Left Col: Planets display */}
                  <div className="p-2 flex flex-col gap-1.5">
                    <span className="font-bold text-indigo-800 text-[9.5px] border-b border-slate-200 pb-0.5 mb-0.5">গ্রহাবস্থান (Planetary Positions)</span>
                    <div className="grid gap-1.5">
                      {sortedShorthandPlanets.map((pl) => (
                        <div key={pl.full} className="grid grid-cols-[72px_1fr] gap-1.5 items-start">
                          <span className="font-bold text-slate-700 text-[9px] shrink-0 text-right pr-1" title={pl.full}>
                            {pl.full} :
                          </span>
                          <div className="grid gap-1">
                            <input
                              className="border border-slate-200 bg-slate-50/50 px-2 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none font-semibold"
                              value={toEnglishDigits(pl.display)}
                              onChange={(e) => updateShorthandPlanet(pl.full, "display", e.target.value)}
                            />
                            <input
                              className="border border-amber-200 bg-amber-50/70 px-2 py-0.5 rounded text-[9px] w-full focus:bg-white focus:outline-none font-medium"
                              value={toEnglishDigits(pl.compact_indexed ?? pl.compact ?? "")}
                              onChange={(e) => updateShorthandPlanet(pl.full, "compact_indexed", e.target.value)}
                            />
                            <span className="text-[8px] text-slate-500">Edit this field with the Panjika value used for PDF override.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Center Col: Kundli Chakra SVG with layout toggle */}
                  <div className="p-2 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between border-b border-slate-200 pb-0.5 mb-1.5">
                      <span className="font-bold text-slate-800 text-[9.5px]">Rashi Chakra</span>
                      <label className="flex items-center gap-1 cursor-pointer text-[8px] text-slate-500 hover:text-slate-800">
                        <input
                          type="checkbox"
                          checked={!!reportState.show_kundli}
                          onChange={(e) => updateToggle("show_kundli", e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                        />
                        <span>Show PDF</span>
                      </label>
                    </div>

                    <div className={`transition-opacity duration-200 ${!reportState.show_kundli ? "opacity-30" : ""}`}>
                      <svg width="180" height="180" viewBox="0 0 300 300" className="stroke-slate-700 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
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
                        <text x="150" y="155" textAnchor="middle" className="text-sm font-black fill-purple-900 tracking-wider select-none">
                          Rashi Chakra
                        </text>

                        {/* Houses Data */}
                        {(() => {
                          const houseLayout = [
                            // House 1 (Top-Middle)
                            { numX: 150, numY: 85, planetsX: 150, planetsY: 35 },
                            // House 2 (Top-Left, Upper half)
                            { numX: 78, numY: 45, planetsX: 75, planetsY: 25 },
                            // House 3 (Top-Left, Lower half)
                            { numX: 22, numY: 80, planetsX: 30, planetsY: 50 },
                            // House 4 (Middle-Left)
                            { numX: 50, numY: 185, planetsX: 50, planetsY: 135 },
                            // House 5 (Bottom-Left, Upper half)
                            { numX: 22, numY: 225, planetsX: 30, planetsY: 235 },
                            // House 6 (Bottom-Left, Lower half)
                            { numX: 78, numY: 280, planetsX: 75, planetsY: 255 },
                            // House 7 (Bottom-Middle)
                            { numX: 150, numY: 285, planetsX: 150, planetsY: 235 },
                            // House 8 (Bottom-Right, Lower half)
                            { numX: 222, numY: 280, planetsX: 225, planetsY: 255 },
                            // House 9 (Bottom-Right, Upper half)
                            { numX: 278, numY: 225, planetsX: 275, planetsY: 235 },
                            // House 10 (Middle-Right)
                            { numX: 250, numY: 185, planetsX: 250, planetsY: 135 },
                            // House 11 (Top-Right, Upper-left half)
                            { numX: 222, numY: 30, planetsX: 230, planetsY: 45 },
                            // House 12 (Top-Right, Lower-right half)
                            { numX: 278, numY: 80, planetsX: 270, planetsY: 65 }
                          ];

                          return houseLayout.map((layout, idx) => {
                            const houseNo = idx + 1;
                            const house = reportState.house_chart[idx];
                            return (
                              <g key={houseNo}>
                                {/* House Number */}
                                <text x={layout.numX} y={layout.numY} textAnchor="middle" className="text-[14px] fill-purple-600 font-extrabold select-none">
                                  {toEnglishDigits(house?.house_bn || String(houseNo))}
                                </text>
                                {/* Planets List */}
                                {house?.planets?.map((planetName, pIdx) => (
                                  <text
                                    key={pIdx}
                                    x={layout.planetsX}
                                    y={layout.planetsY + pIdx * 12}
                                    textAnchor="middle"
                                    className="text-[13px] fill-indigo-950 font-black"
                                  >
                                    {planetName}
                                  </text>
                                ))}
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>

                    {/* House Edit Grid */}
                    <div className="mt-2.5 w-full grid grid-cols-4 gap-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="col-span-4 text-[8px] font-bold text-slate-500 text-center mb-0.5">
                        Edit Houses (1 - 12)
                      </span>
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <label key={idx} className="flex flex-col text-[7.5px] text-slate-500 text-center font-medium">
                          <span>House {idx + 1}</span>
                          <input
                            className="border border-slate-200 bg-white text-center rounded text-[9px] py-0.5 w-full focus:outline-none focus:border-indigo-500"
                            value={toEnglishDigits(reportState.house_chart[idx]?.planets.join(", ") || "")}
                            onChange={(e) => updateHouseChartItem(idx, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Right Col: Summary & Lucky Info */}
                  <div className="p-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-0.5">
                      <span className="font-bold text-indigo-800 text-[9.5px]">Kundli Summary</span>
                      <label className="flex items-center gap-1 cursor-pointer text-[8px] text-slate-500 hover:text-slate-800">
                        <input
                          type="checkbox"
                          checked={!!reportState.show_lucky_info}
                          onChange={(e) => updateToggle("show_lucky_info", e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-3 w-3 cursor-pointer"
                        />
                        <span>Show Lucky</span>
                      </label>
                    </div>

                    {reportState.engine && (
                      <div className="rounded border border-slate-200 bg-slate-50/70 p-2 text-[9px] grid gap-1">
                        <span className="font-bold text-slate-700">Calculation Metadata</span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Engine</span>
                          <span className="font-semibold text-slate-800">{reportState.engine.engine}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">System</span>
                          <span className="font-semibold text-slate-800">{reportState.engine.system}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Ayanamsa</span>
                          <span className="font-semibold text-slate-800">{reportState.engine.ayanamsa}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Moon Mode</span>
                          <span className="font-semibold text-slate-800">{reportState.engine.moon_mode}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Rahu Node</span>
                          <span className="font-semibold text-slate-800">{formValue.true_node ? "True" : "Mean"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Planet Overrides</span>
                          <span className="font-semibold text-slate-800">{Object.keys(reportState.planet_overrides ?? {}).length}</span>
                        </div>
                        {reportState.engine.override_moon && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Moon Override</span>
                            <span className="font-semibold text-slate-800">{reportState.engine.override_moon}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 shrink-0">Rashi:</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.rashi)}
                          onChange={(e) => updateSummaryField("rashi", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 shrink-0">Lagna:</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.lagna)}
                          onChange={(e) => updateSummaryField("lagna", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 shrink-0">Nakshatra:</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.nakshatra)}
                          onChange={(e) => updateSummaryField("nakshatra", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 shrink-0">Pada:</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
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
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.gan)}
                          onChange={(e) => updateSummaryField("gan", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 shrink-0">Varna:</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.varna)}
                          onChange={(e) => updateSummaryField("varna", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Lucky Info Sub-card */}
                    <div className={`p-1.5 rounded border border-amber-150 bg-amber-50/40 grid gap-1.5 transition-opacity ${!reportState.show_lucky_info ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 w-11 shrink-0 text-[8px]">Lucky Day:</span>
                        <input
                          className="border border-slate-200 bg-white px-1 py-0.5 rounded text-[9.5px] w-full focus:outline-none"
                          value={toEnglishDigits(reportState.summary.shubh_bar)}
                          onChange={(e) => updateSummaryField("shubh_bar", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 w-11 shrink-0 text-[8px]">Lucky Color:</span>
                        <input
                          className="border border-slate-200 bg-white px-1 py-0.5 rounded text-[9.5px] w-full focus:outline-none"
                          value={toEnglishDigits(reportState.summary.shubh_rong)}
                          onChange={(e) => updateSummaryField("shubh_rong", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-500 w-11 shrink-0 text-[8px]">Lucky Number:</span>
                        <input
                          className="border border-slate-200 bg-white px-1 py-0.5 rounded text-[9.5px] w-full focus:outline-none"
                          value={toEnglishDigits(reportState.summary.shubh_sonkha)}
                          onChange={(e) => updateSummaryField("shubh_sonkha", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col text-[8.5px]">
                        <span className="font-semibold text-slate-500">Lucky Name Letter</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.current_pada_syllable)}
                          onChange={(e) => {
                            updateSummaryField("current_pada_syllable", e.target.value);
                            updateSummaryField("namer_adokkhyor", e.target.value);
                          }}
                        />
                      </div>
                      <div className="flex flex-col text-[8.5px]">
                        <span className="font-semibold text-slate-500">Nakshatra Lord</span>
                        <input
                          className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none"
                          value={toEnglishDigits(reportState.summary.nakshatra_lord)}
                          onChange={(e) => updateSummaryField("nakshatra_lord", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col text-[8.5px]">
                      <span className="font-semibold text-slate-500">Dasha Balance</span>
                      <input
                        className="border border-slate-200 bg-slate-50/50 px-1 py-0.5 rounded text-[9.5px] w-full focus:bg-white focus:outline-none font-bold"
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
                      <span className="font-bold text-slate-800 text-[9.5px]">Vimshottari Dasha :</span>
                      <label className="flex items-center gap-1 cursor-pointer text-[8px] text-slate-500 hover:text-slate-800">
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
                      <table className="min-w-full text-left text-[8.5px]">
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
                              className={`cursor-pointer hover:bg-indigo-50/40 transition-colors ${
                                activePlanet === dasha.planet ? "bg-amber-50/80 font-bold text-slate-900" : "text-slate-700"
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
                                  className="bg-transparent border-0 p-0 text-[9.5px] w-14 font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                  value={toEnglishDigits(dasha.planet_bn)}
                                  onChange={(e) => updateDashaField(idx, "planet_bn", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-1 py-1 text-center">
                                <input
                                  className="bg-transparent border-0 p-0 text-[9.5px] w-7 text-center font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                  value={toEnglishDigits(dasha.years)}
                                  onChange={(e) => updateDashaField(idx, "years", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  className="bg-transparent border-0 p-0 text-[9.5px] w-16 focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                  value={toEnglishDigits(dasha.start)}
                                  onChange={(e) => updateDashaField(idx, "start", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  className="bg-transparent border-0 p-0 text-[9.5px] w-16 focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
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
                      <span className="font-bold text-slate-800 text-[9.5px] truncate">
                        Antardasha: {toEnglishDigits(reportState.dasha_list.find((d) => d.planet === activePlanet)?.planet_bn || activePlanet)}
                      </span>
                      <label className="flex items-center gap-1 cursor-pointer text-[8px] text-slate-500 hover:text-slate-800">
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
                      <table className="min-w-full text-left text-[8.5px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-655 font-bold border-b border-slate-200">
                            <th className="px-1 py-0.5">Maha / Antar</th>
                            <th className="px-1 py-0.5">Start</th>
                            <th className="px-1 py-0.5">End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const activeGroup = reportState.antardasha_list.find((g) => groupKey(g) === activePlanet);
                            if (!activeGroup) {
                              return (
                                <tr>
                                  <td colSpan={3} className="px-2 py-4 text-center text-slate-450 italic">
                                    No subperiod list for planet "{activePlanet}".
                                  </td>
                                </tr>
                              );
                            }
                            return activeGroup.subperiods.map((sub, sIdx) => (
                              <tr key={sIdx} className="hover:bg-slate-50/50">
                                <td className="px-1 py-1">
                                  <span className="text-[9px] font-semibold text-slate-400 mr-1">
                                    {toEnglishDigits(activeGroup.major_bn)} /
                                  </span>
                                  <input
                                    className="bg-transparent border-0 p-0 text-[9.5px] w-12 font-medium focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(sub.lord_bn)}
                                    onChange={(e) => updateAntardashaField(sIdx, "lord_bn", e.target.value)}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="bg-transparent border-0 p-0 text-[9.5px] w-20 focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(sub.start)}
                                    onChange={(e) => updateAntardashaField(sIdx, "start", e.target.value)}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="bg-transparent border-0 p-0 text-[9.5px] w-20 focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded px-0.5"
                                    value={toEnglishDigits(sub.end)}
                                    onChange={(e) => updateAntardashaField(sIdx, "end", e.target.value)}
                                  />
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
              3. PDF Preview
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
                <a
                  className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1"
                  href={fullPdfUrl}
                  download
                  id="btn-download-pdf"
                >
                  Download
                </a>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[500px] lg:min-h-[70vh] bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
            {rendering && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-600 gap-3">
                <LoadingSpinner />
                <span className="text-xs font-medium tracking-wide">Compiling PDF report...</span>
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
    </main>
  );
}
