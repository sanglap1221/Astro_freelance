"use client";

import { type FormEvent, useState } from "react";
import type { ReportInput } from "../types/report";

type ReportFormProps = {
  value: ReportInput;
  loading?: boolean;
  onChange: (value: ReportInput) => void;
  onSubmit: () => void;
};

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-slate-700">Name</span>
        <input className="rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" value={value.name} onChange={(event) => updateField(value, onChange, "name", event.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-slate-700">Father's Name</span>
        <input className="rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" value={value.father_name ?? ""} onChange={(event) => updateField(value, onChange, "father_name", event.target.value)} />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-slate-700">DOB</span>
        <input type="date" className="rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" value={value.dob} onChange={(event) => updateField(value, onChange, "dob", event.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-slate-700">Time</span>
        <input type="time" className="rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" value={value.time} onChange={(event) => updateField(value, onChange, "time", event.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-slate-700">Place</span>
        <input className="rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" value={value.place} onChange={(event) => updateField(value, onChange, "place", event.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-slate-700">Mobile</span>
        <input className="rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" value={value.mobile ?? ""} onChange={(event) => updateField(value, onChange, "mobile", event.target.value)} />
      </label>

      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">Engine Settings</span>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showAstrologer}
              onChange={(event) => setShowAstrologer(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-0"
            />
            Astrologer review mode
          </label>
        </div>

        <div className="mt-2 grid gap-2">
          <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            Single workflow: Traditional Bengali N.C. Lahiri tables
          </div>

          <label className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <div>
              <span className="font-semibold">True Rahu / Mean Rahu</span>
              <p className="text-[11px] text-slate-500">Enable true node calculations for Rahu.</p>
            </div>
            <input
              type="checkbox"
              checked={value.true_node ?? true}
              onChange={(event) => updateBooleanField(value, onChange, "true_node", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-0"
            />
          </label>

          {showAstrologer && (
            <>
              <label className="grid gap-1 text-xs">
                <span className="font-semibold text-slate-600">Override Moon Longitude (deg)</span>
                <input
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-slate-800 focus:border-amber-500 focus:outline-none"
                  placeholder="e.g. 86.874739"
                  value={value.override_moon_longitude ?? ""}
                  onChange={(event) => updateField(value, onChange, "override_moon_longitude", event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="font-semibold text-slate-600">Override Ascendant Longitude (deg)</span>
                <input
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-slate-800 focus:border-amber-500 focus:outline-none"
                  placeholder="e.g. 35.0"
                  value={value.override_ascendant_longitude ?? ""}
                  onChange={(event) => updateField(value, onChange, "override_ascendant_longitude", event.target.value)}
                />
              </label>
            </>
          )}
        </div>
      </div>

      <button type="submit" disabled={loading} className="mt-2 rounded bg-indigo-600 px-4 py-2.5 font-medium text-white transition-all hover:bg-indigo-750 disabled:opacity-60">
        {loading ? "Calculating..." : "Load Birth Details"}
      </button>
    </form>
  );
}
