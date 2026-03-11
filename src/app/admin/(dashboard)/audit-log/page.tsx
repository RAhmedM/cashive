"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
} from "lucide-react";

// ---- Types ----

interface AuditAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  admin: AuditAdmin;
}

// ---- Helpers ----

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ACTION_COLORS: Record<string, string> = {
  login: "text-green-400",
  logout: "text-[#6B6D77]",
  create: "text-blue-400",
  update: "text-amber-400",
  delete: "text-red-400",
  review: "text-purple-400",
  ban: "text-red-400",
  unban: "text-green-400",
  mute: "text-orange-400",
  approve: "text-green-400",
  reject: "text-red-400",
};

function getActionColor(action: string): string {
  const lower = action.toLowerCase();
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "text-[#8B8D97]";
}

function JsonViewer({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-[#6B6D77] hover:text-[#8B8D97]"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {label}
      </button>
      {open && (
        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-[#0F1117] p-2 text-xs text-[#8B8D97]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<{ id: string; name: string; role: string }[]>([]);
  const [targetTypes, setTargetTypes] = useState<string[]>([]);

  // Filters
  const [adminFilter, setAdminFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (adminFilter) params.set("adminId", adminFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (targetTypeFilter) params.set("targetType", targetTypeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search) params.set("search", search);
      params.set("page", String(page + 1));
      params.set("limit", "50");

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setLogs(json.logs);
      setTotal(json.total);
      setAdmins(json.admins ?? []);
      setTargetTypes(json.targetTypes ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [adminFilter, actionFilter, targetTypeFilter, dateFrom, dateTo, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  }

  function clearFilters() {
    setAdminFilter("");
    setActionFilter("");
    setTargetTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setSearchInput("");
    setPage(0);
  }

  const hasActiveFilters =
    adminFilter || actionFilter || targetTypeFilter || dateFrom || dateTo || search;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-[#F5A623]" />
          <h1 className="text-lg font-semibold text-white">Audit Log</h1>
          <span className="text-sm text-[#6B6D77]">{total} entries</span>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            hasActiveFilters
              ? "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]"
              : "border-[#2A2D37] text-[#8B8D97] hover:text-white"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <button
              onClick={(e) => { e.stopPropagation(); clearFilters(); }}
              className="ml-1 rounded-full bg-[#F5A623]/20 px-1.5 text-[10px]"
            >
              Clear
            </button>
          )}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div>
              <label className="mb-1 block text-xs text-[#6B6D77]">Search</label>
              <form onSubmit={handleSearch} className="flex gap-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4A4D57]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Action, target..."
                    className="w-48 rounded-lg border border-[#2A2D37] bg-[#0F1117] py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-[#F5A623]/50"
                  />
                </div>
              </form>
            </div>

            {/* Admin filter */}
            <div>
              <label className="mb-1 block text-xs text-[#6B6D77]">Admin</label>
              <select
                value={adminFilter}
                onChange={(e) => { setAdminFilter(e.target.value); setPage(0); }}
                className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="">All admins</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target type filter */}
            <div>
              <label className="mb-1 block text-xs text-[#6B6D77]">Target Type</label>
              <select
                value={targetTypeFilter}
                onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(0); }}
                className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="">All types</option>
                {targetTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="mb-1 block text-xs text-[#6B6D77]">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="mb-1 block text-xs text-[#6B6D77]">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A2D37] text-xs text-[#6B6D77]">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Changes</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#4A4D57]">
                    No audit log entries found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#2A2D37] last:border-b-0 hover:bg-[#0F1117]/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#8B8D97]">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-white">
                        {log.admin.name}
                      </div>
                      <div className="text-[10px] text-[#4A4D57]">{log.admin.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.targetType ? (
                        <div>
                          <span className="text-xs text-[#8B8D97]">{log.targetType}</span>
                          {log.targetId && (
                            <div className="text-[10px] text-[#4A4D57] font-mono">
                              {log.targetId.length > 12
                                ? log.targetId.slice(0, 12) + "..."
                                : log.targetId}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#4A4D57]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <JsonViewer
                          data={log.beforeState}
                          label="Before"
                        />
                        <JsonViewer
                          data={log.afterState}
                          label="After"
                        />
                        {!log.beforeState && !log.afterState && (
                          <span className="text-xs text-[#4A4D57]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#4A4D57] font-mono">
                      {log.ip ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2A2D37] px-4 py-3">
            <span className="text-xs text-[#6B6D77]">
              Showing {page * 50 + 1}–{Math.min((page + 1) * 50, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded p-1 text-[#6B6D77] hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-[#8B8D97]">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="rounded p-1 text-[#6B6D77] hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
