import type { ReportInput, ReportState } from "../types/report";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── Auth Header Helper ──

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("astro_jwt_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle 401 responses globally — clear token and redirect to login.
 */
function handleAuthError(response: Response): void {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("astro_jwt_token");
      localStorage.removeItem("astro_user_info");
      window.location.href = "/login";
    }
  }
}

// ── Auth API Calls ──

export async function loginUser(username: string, password: string) {
  const response = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(data?.detail ?? "Login failed");
  }
  return response.json();
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await fetch(`${API}/api/auth/change-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  handleAuthError(response);
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(data?.detail ?? "Password change failed");
  }
  return response.json();
}

export async function getCurrentUser() {
  const response = await fetch(`${API}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to get user info");
  return response.json();
}

// ── Report API Calls (Now with Auth) ──

export async function calculateReport(data: ReportInput): Promise<ReportState> {
  const overrideMoonRaw = data.override_moon_longitude?.trim();
  const overrideMoon = overrideMoonRaw ? Number(overrideMoonRaw) : undefined;
  const payload = {
    ...data,
    override_moon_longitude: Number.isFinite(overrideMoon) ? overrideMoon : undefined,
  };

  const response = await fetch(`${API}/api/calculate-report`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  handleAuthError(response);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Report calculation failed");
  }

  return (await response.json()) as ReportState;
}

export async function renderPdf(state: ReportState): Promise<{ preview_url: string; compiled_pdf_url: string }> {
  const response = await fetch(`${API}/api/render-pdf`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(state),
  });

  handleAuthError(response);

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

// ── Admin API Calls ──

export async function getDashboardStats() {
  const response = await fetch(`${API}/api/admin/dashboard`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to fetch dashboard stats");
  return response.json();
}

export async function getReports(page: number = 1, limit: number = 20) {
  const response = await fetch(`${API}/api/admin/reports?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to fetch reports");
  return response.json();
}

export async function searchReports(params: {
  name?: string;
  mobile?: string;
  date?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.set("name", params.name);
  if (params.mobile) searchParams.set("mobile", params.mobile);
  if (params.date) searchParams.set("date", params.date);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await fetch(`${API}/api/admin/reports/search?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to search reports");
  return response.json();
}

export async function regenerateReport(reportId: string) {
  const response = await fetch(`${API}/api/admin/reports/${reportId}/regenerate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to regenerate report");
  return response.json();
}

export async function deleteAllHistory() {
  const response = await fetch(`${API}/api/admin/reports`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to delete all history");
  return response.json();
}

export async function deleteReport(reportId: string) {
  const response = await fetch(`${API}/api/admin/reports/${reportId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error("Failed to delete report");
  return response.json();
}
