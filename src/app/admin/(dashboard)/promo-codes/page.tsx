"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Tag,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ---- Types ----

interface PromoRedemption {
  id: string;
  userId: string;
  redeemedAt: string;
  user: { username: string; email: string };
}

interface PromoCode {
  id: string;
  code: string;
  rewardHoney: number;
  maxUses: number | null;
  usedCount: number;
  requiresMinEarnings: boolean;
  minEarningsHoney: number;
  isActive: boolean;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  redemptions?: PromoRedemption[];
}

const PAGE_SIZE = 20;

const emptyForm = {
  code: "",
  rewardHoney: 100,
  maxUses: "" as string,
  expiresAt: "",
  isActive: true,
  requiresMinEarnings: false,
  minEarningsHoney: 0,
};

// ---- Helpers ----

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isExpired(code: PromoCode): boolean {
  return code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
}

function isMaxed(code: PromoCode): boolean {
  return code.maxUses !== null && code.usedCount >= code.maxUses;
}

// ---- Usage Modal ----

function UsageModal({
  promo,
  open,
  onClose,
}: {
  promo: PromoCode | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PromoCode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !promo) {
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/promo-codes/${promo!.id}`, { credentials: "include" });
        const d = await res.json();
        if (!cancelled) setDetail(d);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetail();
    return () => { cancelled = true; };
  }, [open, promo]);

  if (!open || !promo) return null;

  const redemptions = detail?.redemptions ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">
            Redemptions &mdash;{" "}
            <span className="font-mono text-[#F5A623]">{promo.code}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-[#6B6D77] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-[#4A4D57]">Reward</div>
              <div className="text-sm text-white">
                {promo.rewardHoney.toLocaleString()} H
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#4A4D57]">Used / Max</div>
              <div className="text-sm text-white">
                {promo.usedCount} / {promo.maxUses ?? "\u221E"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#4A4D57]">Expires</div>
              <div className="text-sm text-white">
                {formatDate(promo.expiresAt)}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#4A4D57]">
              No redemptions yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#2A2D37]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-right">Redeemed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D37]">
                  {redemptions.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">
                        <a
                          href={`/admin/users/${r.userId}`}
                          className="text-white hover:text-[#F5A623]"
                        >
                          {r.user.username}
                        </a>
                        <div className="text-[10px] text-[#4A4D57]">
                          {r.user.email}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-[#6B6D77]">
                        {formatDateTime(r.redeemedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(0);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Usage modal
  const [usagePromo, setUsagePromo] = useState<PromoCode | null>(null);
  const [showUsage, setShowUsage] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set("active", activeFilter);
      params.set("page", String(page + 1));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(
        `/api/admin/promo-codes?${params.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setCodes(json.promoCodes);
      setTotal(json.total);
    } catch {
      setError("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(c: PromoCode) {
    setEditId(c.id);
    setForm({
      code: c.code,
      rewardHoney: c.rewardHoney,
      maxUses: c.maxUses !== null ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? toLocalDatetime(c.expiresAt) : "",
      isActive: c.isActive,
      requiresMinEarnings: c.requiresMinEarnings,
      minEarningsHoney: c.minEarningsHoney,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        rewardHoney: form.rewardHoney,
        isActive: form.isActive,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
      };

      if (!editId) {
        body.code = form.code;
      }

      const url = editId
        ? `/api/admin/promo-codes/${editId}`
        : "/api/admin/promo-codes";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error || "Save failed");
        return;
      }
      setShowModal(false);
      fetchCodes();
    } catch {
      setFormError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, code: string) {
    if (
      !confirm(
        `Delete promo code "${code}"? This only works if it has no redemptions.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Delete failed");
        return;
      }
      fetchCodes();
    } catch {
      alert("Delete failed");
    }
  }

  async function toggleActive(c: PromoCode) {
    try {
      const res = await fetch(`/api/admin/promo-codes/${c.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (!res.ok) return;
      fetchCodes();
    } catch {}
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Promo Codes</h1>
          <p className="text-sm text-[#6B6D77]">
            Create and manage promotional codes
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#F5A623] px-3 py-2 text-sm font-medium text-black hover:bg-[#F5A623]/90"
        >
          <Plus className="h-4 w-4" />
          New Code
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <div className="ml-auto text-xs text-[#6B6D77]">{total} total</div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-right">Reward</th>
                <th className="px-4 py-3 text-right">Used / Max</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-[#4A4D57]"
                  >
                    No promo codes found
                  </td>
                </tr>
              ) : (
                codes.map((c) => {
                  const expired = isExpired(c);
                  const maxed = isMaxed(c);
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer transition-colors hover:bg-[#0F1117]/50"
                      onClick={() => {
                        setUsagePromo(c);
                        setShowUsage(true);
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-[#F5A623]" />
                          <span className="font-mono font-medium text-white">
                            {c.code}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCode(c.code);
                            }}
                            title="Copy code"
                            className="text-[#4A4D57] hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        {c.requiresMinEarnings && (
                          <div className="mt-0.5 text-[10px] text-[#4A4D57]">
                            Min earnings: {c.minEarningsHoney.toLocaleString()} H
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-white">
                        {c.rewardHoney.toLocaleString()} H
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-[#8B8D97]">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3" />
                          {c.usedCount} / {c.maxUses ?? "\u221E"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {c.isActive && !expired && !maxed ? (
                          <span className="rounded bg-green-400/10 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                            ACTIVE
                          </span>
                        ) : expired ? (
                          <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                            EXPIRED
                          </span>
                        ) : maxed ? (
                          <span className="rounded bg-[#2A2D37] px-1.5 py-0.5 text-[10px] font-medium text-[#6B6D77]">
                            MAXED
                          </span>
                        ) : (
                          <span className="rounded bg-[#2A2D37] px-1.5 py-0.5 text-[10px] font-medium text-[#6B6D77]">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                        {formatDate(c.expiresAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => toggleActive(c)}
                            title={c.isActive ? "Deactivate" : "Activate"}
                            className={`rounded-md p-1.5 ${
                              c.isActive
                                ? "text-green-400 hover:bg-green-500/10"
                                : "text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                            }`}
                          >
                            {c.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit"
                            className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.code)}
                            title="Delete"
                            className="rounded-md p-1.5 text-[#6B6D77] hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
              <h3 className="text-sm font-semibold text-white">
                {editId ? "Edit Promo Code" : "Create Promo Code"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#6B6D77] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              {formError && (
                <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {formError}
                </div>
              )}

              {!editId && (
                <FormField label="Code" required>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. WELCOME2026"
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 font-mono text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                  />
                  <div className="mt-1 text-[11px] text-[#4A4D57]">
                    3-50 characters, auto-uppercased
                  </div>
                </FormField>
              )}

              <FormField label="Reward (Honey)" required>
                <input
                  type="number"
                  value={form.rewardHoney}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rewardHoney: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                />
                <div className="mt-1 text-[11px] text-[#4A4D57]">
                  = ${((form.rewardHoney || 0) / 1000).toFixed(2)} USD
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Max Uses">
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm({ ...form, maxUses: e.target.value })
                    }
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
                <FormField label="Expires At">
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[#8B8D97]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="rounded border-[#2A2D37]"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={saving || (!editId && !form.code) || form.rewardHoney < 1}
                  onClick={handleSave}
                  className="rounded-lg bg-[#F5A623] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#F5A623]/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      <UsageModal
        promo={usagePromo}
        open={showUsage}
        onClose={() => {
          setShowUsage(false);
          setUsagePromo(null);
        }}
      />
    </div>
  );
}

// ---- Form Field helper ----

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#8B8D97]">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
