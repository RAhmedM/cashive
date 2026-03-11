"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CheckCircle,
  XCircle,
  Play,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";

// ---- Types ----

interface WithdrawalUser {
  id: string;
  username: string;
  email: string;
  fraudScore: number;
  isBanned: boolean;
  lifetimeEarned: number;
}

interface WithdrawalRow {
  id: string;
  userId: string;
  method: string;
  amountHoney: number;
  amountUsdCents: number;
  feeUsdCents: number;
  status: string;
  fraudScoreAtRequest: number;
  isFirstWithdrawal: boolean;
  paypalEmail: string | null;
  cryptoAddress: string | null;
  cryptoCurrency: string | null;
  giftCardType: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  externalPaymentId: string | null;
  createdAt: string;
  processedAt: string | null;
  user: WithdrawalUser;
}

interface StatusCounts {
  pending: number;
  approved: number;
  processing: number;
}

const STATUSES = ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "FAILED"] as const;
const METHODS = ["PAYPAL", "BTC", "ETH", "LTC", "SOL", "AMAZON", "STEAM", "ROBLOX", "VISA"] as const;
const PAGE_SIZE = 50;

// ---- Helpers ----

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusStyles: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
  APPROVED: { color: "text-blue-400", bg: "bg-blue-400/10" },
  PROCESSING: { color: "text-purple-400", bg: "bg-purple-400/10" },
  COMPLETED: { color: "text-green-400", bg: "bg-green-400/10" },
  REJECTED: { color: "text-red-400", bg: "bg-red-400/10" },
  FAILED: { color: "text-red-400", bg: "bg-red-400/10" },
};

// ---- Review Modal ----

function ReviewModal({
  withdrawal,
  open,
  onClose,
  onDone,
}: {
  withdrawal: WithdrawalRow | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !withdrawal) return null;

  async function doAction(action: "approve" | "reject") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawal!.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: note || undefined }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Action failed");
        return;
      }
      onDone();
      onClose();
    } catch {
      setError("Action failed");
    } finally {
      setLoading(false);
    }
  }

  async function doProcess() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawal!.id}/process`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Processing failed");
        return;
      }
      onDone();
      onClose();
    } catch {
      setError("Processing failed");
    } finally {
      setLoading(false);
    }
  }

  const w = withdrawal;
  const dest =
    w.method === "PAYPAL"
      ? w.paypalEmail
      : ["BTC", "ETH", "LTC", "SOL"].includes(w.method)
        ? `${w.cryptoCurrency}: ${w.cryptoAddress?.slice(0, 12)}...${w.cryptoAddress?.slice(-6)}`
        : w.giftCardType
          ? `${w.giftCardType} gift card`
          : w.method;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">
            Review Withdrawal
          </h3>
          <button
            onClick={onClose}
            className="text-[#6B6D77] hover:text-white"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4 p-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCell label="Amount" value={formatCents(w.amountUsdCents)} />
            <InfoCell label="Honey" value={w.amountHoney.toLocaleString()} />
            <InfoCell label="Method" value={w.method} />
            <InfoCell label="Destination" value={dest ?? "—"} />
            <InfoCell label="Fee" value={w.feeUsdCents > 0 ? formatCents(w.feeUsdCents) : "None"} />
            <InfoCell
              label="First Withdrawal"
              value={w.isFirstWithdrawal ? "Yes" : "No"}
            />
          </div>

          {/* User info */}
          <div className="rounded-lg border border-[#2A2D37] bg-[#0F1117] p-3">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[#4A4D57]">
              User
            </div>
            <div className="flex items-center justify-between">
              <div>
                <a
                  href={`/admin/users/${w.user.id}`}
                  className="text-sm font-medium text-[#F5A623] hover:underline"
                >
                  {w.user.username}
                </a>
                <span className="ml-2 text-xs text-[#6B6D77]">
                  {w.user.email}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span
                  className={
                    w.user.fraudScore >= 70
                      ? "text-red-400"
                      : w.user.fraudScore >= 40
                        ? "text-yellow-400"
                        : "text-green-400"
                  }
                >
                  Fraud: {w.user.fraudScore.toFixed(1)}
                </span>
                {w.user.isBanned && (
                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
                    Banned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fraud warning */}
          {(w.fraudScoreAtRequest >= 40 || w.user.fraudScore >= 40) && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Fraud score at request: {w.fraudScoreAtRequest.toFixed(1)} |
              Current: {w.user.fraudScore.toFixed(1)}
            </div>
          )}

          {/* Actions based on status */}
          {w.status === "PENDING" && (
            <>
              <div>
                <label className="mb-1 block text-xs text-[#6B6D77]">
                  Review note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Internal note..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  onClick={() => doAction("reject")}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  disabled={loading}
                  onClick={() => doAction("approve")}
                  className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </button>
              </div>
            </>
          )}

          {w.status === "APPROVED" && (
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
              >
                Close
              </button>
              <button
                disabled={loading}
                onClick={() => doProcess()}
                className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                Process Payout
              </button>
            </div>
          )}

          {!["PENDING", "APPROVED"].includes(w.status) && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
              >
                Close
              </button>
            </div>
          )}

          {error && (
            <div className="text-center text-xs text-red-400">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[#4A4D57]">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}

// ---- Main Component ----

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ pending: 0, approved: 0, processing: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [showReview, setShowReview] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (methodFilter) params.set("method", methodFilter);
      params.set("sort", sort);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`/api/admin/withdrawals?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setWithdrawals(json.withdrawals);
      setTotal(json.total);
      setStatusCounts(json.statusCounts);
    } catch {
      setError("Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, sort, page]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = statusFilter || methodFilter;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Withdrawals</h1>
        <p className="text-sm text-[#6B6D77]">
          Review, approve, and process withdrawal requests
        </p>
      </div>

      {/* Status Badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge
          label="Pending"
          count={statusCounts.pending}
          color="yellow"
          active={statusFilter === "PENDING"}
          onClick={() => {
            setStatusFilter(statusFilter === "PENDING" ? "" : "PENDING");
            setPage(0);
          }}
        />
        <StatusBadge
          label="Approved"
          count={statusCounts.approved}
          color="blue"
          active={statusFilter === "APPROVED"}
          onClick={() => {
            setStatusFilter(statusFilter === "APPROVED" ? "" : "APPROVED");
            setPage(0);
          }}
        />
        <StatusBadge
          label="Processing"
          count={statusCounts.processing}
          color="purple"
          active={statusFilter === "PROCESSING"}
          onClick={() => {
            setStatusFilter(statusFilter === "PROCESSING" ? "" : "PROCESSING");
            setPage(0);
          }}
        />
      </div>

      {/* Filters Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
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
          </button>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "newest" | "oldest");
              setPage(0);
            }}
            className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="ml-auto text-xs text-[#6B6D77]">
          {total.toLocaleString()} total
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-[#2A2D37] bg-[#1A1D27] p-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6B6D77]">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[#2A2D37] bg-[#0F1117] px-2.5 py-1.5 text-sm text-white outline-none"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6B6D77]">
              Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[#2A2D37] bg-[#0F1117] px-2.5 py-1.5 text-sm text-white outline-none"
            >
              <option value="">All</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("");
                  setMethodFilter("");
                  setPage(0);
                }}
                className="rounded-md px-2.5 py-1.5 text-sm text-[#F5A623] hover:bg-[#F5A623]/10"
              >
                Clear
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Fraud</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Processed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-red-400">
                    {error}
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#4A4D57]">
                    No withdrawals found
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  const st = statusStyles[w.status] ?? { color: "text-[#6B6D77]", bg: "bg-[#2A2D37]" };
                  return (
                    <tr
                      key={w.id}
                      className="cursor-pointer transition-colors hover:bg-[#0F1117]/50"
                      onClick={() => {
                        setSelectedWithdrawal(w);
                        setShowReview(true);
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="font-medium text-white">
                          {w.user.username}
                        </div>
                        <div className="text-[11px] text-[#4A4D57]">
                          {w.user.email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[#8B8D97]">
                        {w.method}
                        {w.isFirstWithdrawal && (
                          <span className="ml-1.5 rounded bg-blue-500/10 px-1 py-0.5 text-[10px] text-blue-400">
                            1st
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-medium text-white">
                        {formatCents(w.amountUsdCents)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${st.color} ${st.bg}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <span
                          className={`font-mono text-xs ${
                            w.fraudScoreAtRequest >= 70
                              ? "text-red-400"
                              : w.fraudScoreAtRequest >= 40
                                ? "text-yellow-400"
                                : "text-[#6B6D77]"
                          }`}
                        >
                          {w.fraudScoreAtRequest.toFixed(1)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                        {formatDateTime(w.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                        {formatDateTime(w.processedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {w.status === "PENDING" && (
                          <span className="rounded bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-400">
                            Review
                          </span>
                        )}
                        {w.status === "APPROVED" && (
                          <span className="rounded bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-400">
                            Process
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
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
                className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-[#8B8D97]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        withdrawal={selectedWithdrawal}
        open={showReview}
        onClose={() => {
          setShowReview(false);
          setSelectedWithdrawal(null);
        }}
        onDone={fetchWithdrawals}
      />
    </div>
  );
}

// ---- Status Badge ----

function StatusBadge({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: "yellow" | "blue" | "purple";
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    yellow: active
      ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-400"
      : "border-[#2A2D37] bg-[#1A1D27] text-[#8B8D97] hover:border-yellow-400/20 hover:text-yellow-400",
    blue: active
      ? "border-blue-400/40 bg-blue-400/15 text-blue-400"
      : "border-[#2A2D37] bg-[#1A1D27] text-[#8B8D97] hover:border-blue-400/20 hover:text-blue-400",
    purple: active
      ? "border-purple-400/40 bg-purple-400/15 text-purple-400"
      : "border-[#2A2D37] bg-[#1A1D27] text-[#8B8D97] hover:border-purple-400/20 hover:text-purple-400",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${colors[color]}`}
    >
      <Clock className="h-3.5 w-3.5" />
      {label}
      {count > 0 && (
        <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
}
