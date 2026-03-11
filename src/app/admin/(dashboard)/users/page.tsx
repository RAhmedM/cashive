"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

// ---- Types ----

interface UserRow {
  id: string;
  username: string;
  email: string;
  balanceHoney: number;
  lifetimeEarned: number;
  vipTier: string;
  fraudScore: number;
  isBanned: boolean;
  country: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

type SortField =
  | "createdAt"
  | "username"
  | "email"
  | "balanceHoney"
  | "lifetimeEarned"
  | "fraudScore"
  | "vipTier";

// ---- Helpers ----

function formatHoney(honey: number): string {
  return honey.toLocaleString("en-US");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const vipColors: Record<string, string> = {
  NONE: "text-[#6B6D77]",
  BRONZE: "text-amber-600",
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
};

const VIP_TIERS = ["NONE", "BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;

const PAGE_SIZE = 50;

// ---- Component ----

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vipFilter, setVipFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (vipFilter) params.set("vipTier", vipFilter);
      if (bannedFilter) params.set("banned", bannedFilter);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json();
      setUsers(json.users);
      setTotal(json.total);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, vipFilter, bannedFilter, sortBy, sortDir, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-0.5 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-0.5 inline h-3 w-3" />
    );
  }

  const hasActiveFilters = vipFilter || bannedFilter;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="text-sm text-[#6B6D77]">
          {total.toLocaleString()} total users
        </p>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A4D57]" />
          <input
            type="text"
            placeholder="Search by username, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#2A2D37] bg-[#1A1D27] py-2 pl-9 pr-3 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4D57] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            hasActiveFilters
              ? "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]"
              : "border-[#2A2D37] bg-[#1A1D27] text-[#8B8D97] hover:text-white"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="rounded-full bg-[#F5A623] px-1.5 py-0.5 text-[10px] font-bold text-black">
              {(vipFilter ? 1 : 0) + (bannedFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-[#2A2D37] bg-[#1A1D27] p-3">
          {/* VIP Tier */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6B6D77]">
              VIP Tier
            </label>
            <select
              value={vipFilter}
              onChange={(e) => {
                setVipFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[#2A2D37] bg-[#0F1117] px-2.5 py-1.5 text-sm text-white outline-none"
            >
              <option value="">All</option>
              {VIP_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Banned */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6B6D77]">
              Status
            </label>
            <select
              value={bannedFilter}
              onChange={(e) => {
                setBannedFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[#2A2D37] bg-[#0F1117] px-2.5 py-1.5 text-sm text-white outline-none"
            >
              <option value="">All</option>
              <option value="false">Active</option>
              <option value="true">Banned</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setVipFilter("");
                  setBannedFilter("");
                  setPage(0);
                }}
                className="rounded-md px-2.5 py-1.5 text-sm text-[#F5A623] hover:bg-[#F5A623]/10"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                <th
                  className="cursor-pointer px-4 py-3 hover:text-white"
                  onClick={() => handleSort("username")}
                >
                  User
                  <SortIcon field="username" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-white"
                  onClick={() => handleSort("email")}
                >
                  Email
                  <SortIcon field="email" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right hover:text-white"
                  onClick={() => handleSort("balanceHoney")}
                >
                  Balance
                  <SortIcon field="balanceHoney" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right hover:text-white"
                  onClick={() => handleSort("lifetimeEarned")}
                >
                  Lifetime
                  <SortIcon field="lifetimeEarned" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-white"
                  onClick={() => handleSort("vipTier")}
                >
                  VIP
                  <SortIcon field="vipTier" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right hover:text-white"
                  onClick={() => handleSort("fraudScore")}
                >
                  Fraud
                  <SortIcon field="fraudScore" />
                </th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Status</th>
                <th
                  className="cursor-pointer px-4 py-3 hover:text-white"
                  onClick={() => handleSort("createdAt")}
                >
                  Joined
                  <SortIcon field="createdAt" />
                </th>
                <th className="px-4 py-3">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-sm text-red-400"
                  >
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-sm text-[#4A4D57]"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[#0F1117]/50"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="font-medium text-white">
                        {user.username}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#8B8D97]">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-[#C8C9CE]">
                      {formatHoney(user.balanceHoney)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-[#C8C9CE]">
                      {formatHoney(user.lifetimeEarned)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={`text-xs font-medium ${vipColors[user.vipTier] ?? "text-[#6B6D77]"}`}
                      >
                        {user.vipTier}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <span
                        className={`font-mono text-xs ${
                          user.fraudScore >= 70
                            ? "text-red-400"
                            : user.fraudScore >= 40
                              ? "text-yellow-400"
                              : "text-[#6B6D77]"
                        }`}
                      >
                        {user.fraudScore}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#8B8D97]">
                      {user.country ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {user.isBanned ? (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-medium text-red-400">
                          Banned
                        </span>
                      ) : (
                        <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#6B6D77]">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#6B6D77]">
                      {formatDateShort(user.lastLoginAt)}
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
            <div className="text-xs text-[#6B6D77]">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
              {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#6B6D77]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-[#8B8D97]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#6B6D77]"
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
