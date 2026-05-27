import type { ReportInput, ReportState } from "../types/report";

const API = "http://127.0.0.1:8000";

export async function calculateReport(data: ReportInput): Promise<ReportState> {
  const overrideMoonRaw = data.override_moon_longitude?.trim();
  const overrideMoon = overrideMoonRaw ? Number(overrideMoonRaw) : undefined;
  const payload = {
    ...data,
    override_moon_longitude: Number.isFinite(overrideMoon) ? overrideMoon : undefined,
  };

  const response = await fetch(`${API}/api/calculate-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Report calculation failed");
  }

  return (await response.json()) as ReportState;
}

export async function renderPdf(state: ReportState): Promise<{ pdf_url: string }> {
  const response = await fetch(`${API}/api/render-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "PDF rendering failed");
  }

  return (await response.json()) as { pdf_url: string };
}
