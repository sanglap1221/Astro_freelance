import type { ReportInput, ReportState } from "../types/report";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

export async function renderPdf(state: ReportState): Promise<{ preview_url: string; compiled_pdf_url: string }> {
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

  const data = await response.json() as { html: string; pdf_url: string };
  const blob = new Blob([data.html], { type: "text/html" });
  const preview_url = URL.createObjectURL(blob);
  return { preview_url, compiled_pdf_url: `${API}${data.pdf_url}` };
}

export async function getPdfStatus(reportId: string): Promise<{ status: string; progress: number }> {
  const response = await fetch(`${API}/api/pdf-status/${reportId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch PDF status");
  }
  return (await response.json()) as { status: string; progress: number };
}

