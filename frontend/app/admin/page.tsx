"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import {
  getDashboardStats,
  getReports,
  searchReports,
  changePassword,
  regenerateReport,
  renderPdf,
  deleteAllHistory,
  deleteReport,
  API,
} from "../../services/api";

interface Report {
  report_id: string;
  name: string;
  father_name?: string;
  mobile?: string;
  dob: string;
  tob: string;
  birth_place: string;
  created_at: string;
  created_by?: string;
}

interface DashboardStats {
  total_reports: number;
  today_reports: number;
}

export default function AdminPage() {
  const { user, isAdmin, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({ total_reports: 0, today_reports: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingReports, setLoadingReports] = useState(false);

  // Search state
  const [searchName, setSearchName] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Report regeneration state
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports" | "password">("dashboard");

  // ── Load Data ──

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    }
  }, []);

  const loadReports = useCallback(async (page: number = 1) => {
    setLoadingReports(true);
    try {
      const data = await getReports(page, 15);
      setReports(data.reports);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadDashboard();
      loadReports(1);
    }
  }, [isAuthenticated, isAdmin, loadDashboard, loadReports]);

  // ── Search ──

  const handleSearch = async () => {
    if (!searchName && !searchMobile && !searchDate) {
      loadReports(1);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchReports({
        name: searchName || undefined,
        mobile: searchMobile || undefined,
        date: searchDate || undefined,
      });
      setReports(data.reports);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(1);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchName("");
    setSearchMobile("");
    setSearchDate("");
    loadReports(1);
  };

  // ── Password Change ──

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Report Regeneration ──

  const handleViewReport = async (report: Report) => {
    setRegeneratingId(report.report_id);
    try {
      // Regenerate chart from stored birth data
      const context = await regenerateReport(report.report_id);

      // Render PDF HTML preview
      const result = await renderPdf(context);

      // Open in a new window (Electron will handle this via setWindowOpenHandler)
      window.open(result.preview_url, "_blank", "width=900,height=700,menubar=no,toolbar=no");
    } catch (err) {
      console.error("Failed to regenerate report:", err);
      alert("Failed to regenerate report. Please try again.");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDeleteAllHistory = async () => {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Are you sure you want to delete all customer report history? This will delete all saved names, birth details, and records. This action is permanent and cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const res = await deleteAllHistory();
      alert(`Success: ${res.message || "All history deleted."} (Deleted ${res.deleted_count ?? 0} records)`);
      loadDashboard();
      loadReports(1);
    } catch (err) {
      console.error("Failed to delete history:", err);
      alert(err instanceof Error ? err.message : "Failed to delete history");
    }
  };

  const handleDeleteReport = async (reportId: string, reportName: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the report for "${reportName}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await deleteReport(reportId);
      loadDashboard();
      loadReports(currentPage);
    } catch (err) {
      console.error("Failed to delete report:", err);
      alert(err instanceof Error ? err.message : "Failed to delete report");
    }
  };

  // ── Formatting ──

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // ── Guards ──

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f5f0" }}>
        <div className="text-amber-700 animate-pulse text-lg">
          <i className="fa-solid fa-spinner fa-spin mr-2" />
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#f7f5f0" }}>
        <div className="text-red-600 text-lg font-bold flex items-center gap-2">
          <i className="fa-solid fa-shield-halved" />
          Admin Access Required
        </div>
        <Link href="/" className="text-sm text-amber-700 underline hover:text-amber-900">
          ← Back to Home
        </Link>
      </div>
    );
  }

  // ── Styles ──

  const cardStyle = {
    background: "white",
    border: "1px solid #ebdcb9",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  const tabStyle = (isActive: boolean) => ({
    padding: "8px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer" as const,
    transition: "all 0.2s",
    border: "none",
    background: isActive ? "#800020" : "transparent",
    color: isActive ? "white" : "#64748b",
  });

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e3d0ab",
    fontSize: "13px",
    outline: "none",
    background: "white",
    color: "#334155",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif", background: "#f7f5f0", color: "#334155" }}>

      {/* ── Header ── */}
      <header
        className="w-full py-3 px-4 sm:px-6 border-b flex items-center justify-between shadow-sm"
        style={{ borderColor: "#ebdcb9", background: "#fdfcf7" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md" style={{ background: "#92400e" }}>
            <i className="fa-solid fa-shield-halved" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "#1a365d" }}>Admin Panel</h1>
            <p className="text-xs font-medium" style={{ color: "rgba(146, 64, 14, 0.8)" }}>
              Logged in as <strong>{user?.username}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
            style={{ color: "#2563eb", background: "#eff6ff", borderColor: "#bfdbfe" }}
            title="Reload Page"
          >
            <i className="fa-solid fa-arrows-rotate" /> Reload
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
            style={{ color: "#475569", background: "#f8fafc", borderColor: "#cbd5e1" }}
          >
            <i className="fa-solid fa-home" /> Home
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm"
            style={{ color: "#ef4444", background: "#fef2f2", borderColor: "#fecaca" }}
          >
            <i className="fa-solid fa-right-from-bracket" /> Logout
          </button>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="px-4 sm:px-6 pt-4 flex items-center gap-2">
        <button style={tabStyle(activeTab === "dashboard")} onClick={() => { setActiveTab("dashboard"); loadDashboard(); loadReports(1); }}>
          <i className="fa-solid fa-chart-line mr-1.5" />Dashboard & History
        </button>
        <button style={tabStyle(activeTab === "password")} onClick={() => setActiveTab("password")}>
          <i className="fa-solid fa-key mr-1.5" />Change Password
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">

        {/* ─── Dashboard & History Tab ─── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Reports */}
              <div style={cardStyle} className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #800020, #590219)" }}>
                  <i className="fa-solid fa-file-lines text-white text-lg" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</p>
                  <p className="text-2xl font-extrabold" style={{ color: "#1a365d" }}>{stats.total_reports}</p>
                </div>
              </div>

              {/* Today's Reports */}
              <div style={cardStyle} className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <i className="fa-solid fa-calendar-day text-white text-lg" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Reports</p>
                  <p className="text-2xl font-extrabold" style={{ color: "#1a365d" }}>{stats.today_reports}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={cardStyle} className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}>
                  <i className="fa-solid fa-bolt text-white text-lg" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</p>
                  <Link
                    href="/"
                    className="text-sm font-bold hover:underline"
                    style={{ color: "#059669" }}
                  >
                    + New Report
                  </Link>
                </div>
              </div>

              {/* Danger Zone: Delete History */}
              <div style={cardStyle} className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}>
                  <i className="fa-solid fa-trash-can text-white text-lg" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Danger Zone</p>
                  <button
                    onClick={handleDeleteAllHistory}
                    className="text-sm font-bold hover:underline text-red-600 border-none bg-transparent p-0 cursor-pointer text-left font-[inherit]"
                  >
                    Delete All History
                  </button>
                </div>
              </div>
            </div>

            {/* Reports Section */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div style={cardStyle} className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    style={inputStyle}
                    placeholder="🔍 Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <input
                    style={inputStyle}
                    placeholder="📱 Mobile number..."
                    value={searchMobile}
                    onChange={(e) => setSearchMobile(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <input
                    type="date"
                    style={inputStyle}
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="flex-1 py-2 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #800020, #590219)" }}
                    >
                      {isSearching ? <i className="fa-solid fa-spinner fa-spin" /> : "Search"}
                    </button>
                    <button
                      onClick={clearSearch}
                      className="px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                      style={{ color: "#64748b", borderColor: "#cbd5e1" }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Reports Table */}
              <div style={cardStyle} className="overflow-hidden">
                {loadingReports ? (
                  <div className="p-8 text-center text-slate-500">
                    <i className="fa-solid fa-spinner fa-spin text-lg mr-2" />
                    Loading reports...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <i className="fa-solid fa-inbox text-3xl mb-2 block" />
                    No reports found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "#fdfcf9", borderBottom: "2px solid #ebdcb9" }}>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Father</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Mobile</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">DOB</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Place</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                          <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, idx) => (
                          <tr
                            key={report.report_id || idx}
                            className="hover:bg-amber-50/40 transition-colors"
                            style={{ borderBottom: "1px solid #f3ead8" }}
                          >
                            <td className="py-3 px-4 font-semibold" style={{ color: "#1a365d" }}>{report.name}</td>
                            <td className="py-3 px-4 text-slate-500 hidden sm:table-cell">{report.father_name || "-"}</td>
                            <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{report.mobile || "-"}</td>
                            <td className="py-3 px-4 text-slate-600">{report.dob}</td>
                            <td className="py-3 px-4 text-slate-500 hidden lg:table-cell">{report.birth_place}</td>
                            <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">{formatDate(report.created_at)}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleViewReport(report)}
                                  disabled={regeneratingId === report.report_id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                  style={{
                                    background: regeneratingId === report.report_id ? "#f0f0f0" : "linear-gradient(135deg, #059669, #047857)",
                                    color: regeneratingId === report.report_id ? "#64748b" : "white",
                                  }}
                                >
                                  {regeneratingId === report.report_id ? (
                                    <><i className="fa-solid fa-spinner fa-spin" /> Generating...</>
                                  ) : (
                                    <><i className="fa-solid fa-eye" /> View</>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteReport(report.report_id, report.name)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:bg-red-50 text-red-600 border-red-200"
                                  style={{
                                    background: "white",
                                  }}
                                  title="Delete Report"
                                >
                                  <i className="fa-solid fa-trash-can" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #ebdcb9", background: "#fdfcf9" }}>
                    <span className="text-xs text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadReports(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border disabled:opacity-40 transition-all"
                        style={{ borderColor: "#cbd5e1" }}
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => loadReports(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border disabled:opacity-40 transition-all"
                        style={{ borderColor: "#cbd5e1" }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Password Tab ─── */}
        {activeTab === "password" && (
          <div className="max-w-md mx-auto">
            <div style={cardStyle} className="p-6 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#1a365d" }}>
                <i className="fa-solid fa-key text-amber-600" />
                Change Password
              </h2>
              <p className="text-xs text-slate-500">Minimum 6 characters required for the new password.</p>

              {passwordError && (
                <div className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444" }}>
                  <i className="fa-solid fa-circle-exclamation" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>
                  <i className="fa-solid fa-circle-check" />
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #800020, #590219)" }}
              >
                {changingPassword ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Changing...</>
                ) : (
                  <><i className="fa-solid fa-check" /> Change Password</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
