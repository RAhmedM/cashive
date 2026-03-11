"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trophy,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Award,
} from "lucide-react";

// ---- Types ----

interface RaceEntry {
  id: string;
  userId: string;
  points: number;
  finalRank: number | null;
  prizeHoney: number | null;
  user: { username: string; email: string };
}

interface Race {
  id: string;
  type: "DAILY" | "MONTHLY";
  title: string;
  prizePoolUsdCents: number;
  prizeDistribution: { rank: number; amount: number }[];
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "FINALIZING" | "COMPLETED";
  finalizedAt: string | null;
  createdAt: string;
  _count?: { entries: number };
  entries?: RaceEntry[];
}

const PAGE_SIZE = 20;

const statusStyles: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: "text-green-400", bg: "bg-green-400/10" },
  FINALIZING: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
  COMPLETED: { color: "text-[#6B6D77]", bg: "bg-[#2A2D37]" },
};

// ---- Helpers ----

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: string): string {
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

function hasEnded(race: Race): boolean {
  return new Date(race.endsAt) <= new Date();
}

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Detail Modal ----

function RaceDetailModal({
  race,
  open,
  onClose,
  onDistribute,
}: {
  race: Race | null;
  open: boolean;
  onClose: () => void;
  onDistribute: (id: string) => void;
}) {
  const [detail, setDetail] = useState<Race | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !race) {
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/races/${race!.id}`, { credentials: "include" });
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
  }, [open, race]);

  if (!open || !race) return null;

  const r = detail ?? race;
  const entries = detail?.entries ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Race Details</h3>
          <button onClick={onClose} className="text-[#6B6D77] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCell label="Title" value={r.title} />
            <InfoCell label="Type" value={r.type} />
            <InfoCell label="Status" value={r.status} />
            <InfoCell label="Prize Pool" value={formatCents(r.prizePoolUsdCents)} />
            <InfoCell label="Starts" value={formatDateTime(r.startsAt)} />
            <InfoCell label="Ends" value={formatDateTime(r.endsAt)} />
          </div>

          {/* Prize Distribution */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#4A4D57]">
              Prize Distribution
            </div>
            <div className="rounded-lg border border-[#2A2D37] bg-[#0F1117] p-3">
              <div className="flex flex-wrap gap-2">
                {r.prizeDistribution.map((p) => (
                  <div
                    key={p.rank}
                    className="rounded-md border border-[#2A2D37] bg-[#1A1D27] px-3 py-1.5 text-xs"
                  >
                    <span className="text-[#F5A623]">#{p.rank}</span>
                    <span className="ml-2 text-white">{formatCents(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Distribute button for ended races that are still ACTIVE */}
          {r.status === "ACTIVE" && hasEnded(r) && (
            <button
              onClick={() => onDistribute(r.id)}
              className="flex items-center gap-1.5 rounded-lg bg-[#F5A623]/10 px-3 py-2 text-sm font-medium text-[#F5A623] hover:bg-[#F5A623]/20"
            >
              <Award className="h-4 w-4" />
              Distribute Prizes
            </button>
          )}

          {/* Leaderboard */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#4A4D57]">
              {r.status === "COMPLETED" ? "Final Rankings" : "Live Leaderboard"} (Top 10)
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
              </div>
            ) : entries.length === 0 ? (
              <div className="py-4 text-center text-sm text-[#4A4D57]">
                No participants yet
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[#2A2D37]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                      <th className="px-3 py-2 text-left">Rank</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-right">Points</th>
                      {r.status === "COMPLETED" && (
                        <th className="px-3 py-2 text-right">Prize</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2D37]">
                    {entries.map((entry, i) => (
                      <tr key={entry.id}>
                        <td className="px-3 py-2 text-[#F5A623]">
                          #{entry.finalRank ?? i + 1}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={`/admin/users/${entry.userId}`}
                            className="text-white hover:text-[#F5A623]"
                          >
                            {entry.user.username}
                          </a>
                          <div className="text-[10px] text-[#4A4D57]">
                            {entry.user.email}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-white">
                          {entry.points.toLocaleString()}
                        </td>
                        {r.status === "COMPLETED" && (
                          <td className="px-3 py-2 text-right font-mono text-green-400">
                            {entry.prizeHoney
                              ? entry.prizeHoney.toLocaleString() + " H"
                              : "\u2014"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

// ---- Create / Edit Modal ----

const emptyForm = {
  type: "DAILY" as "DAILY" | "MONTHLY",
  title: "",
  prizePoolUsdCents: 1000,
  prizeDistribution:
    '[{"rank":1,"amount":500},{"rank":2,"amount":300},{"rank":3,"amount":200}]',
  startsAt: "",
  endsAt: "",
  status: "ACTIVE" as "ACTIVE" | "FINALIZING" | "COMPLETED",
};

// ---- Main Component ----

export default function AdminRacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Detail modal
  const [detailRace, setDetailRace] = useState<Race | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchRaces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter === "active") params.set("active", "true");
      else if (statusFilter === "completed") params.set("active", "false");
      params.set("page", String(page + 1));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/races?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setRaces(json.races);
      setTotal(json.total);
    } catch {
      setError("Failed to load races");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page]);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(r: Race) {
    setEditId(r.id);
    setForm({
      type: r.type,
      title: r.title,
      prizePoolUsdCents: r.prizePoolUsdCents,
      prizeDistribution: JSON.stringify(r.prizeDistribution, null, 2),
      startsAt: toLocalDatetime(r.startsAt),
      endsAt: toLocalDatetime(r.endsAt),
      status: r.status,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      let dist;
      try {
        dist = JSON.parse(form.prizeDistribution);
      } catch {
        setFormError("Invalid prize distribution JSON");
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        title: form.title,
        prizePoolUsdCents: form.prizePoolUsdCents,
        prizeDistribution: dist,
      };

      if (editId) {
        body.status = form.status;
        if (form.startsAt)
          body.startsAt = new Date(form.startsAt).toISOString();
        if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString();
      } else {
        body.type = form.type;
        body.startsAt = new Date(form.startsAt).toISOString();
        body.endsAt = new Date(form.endsAt).toISOString();
      }

      const url = editId ? `/api/admin/races/${editId}` : "/api/admin/races";
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
      fetchRaces();
    } catch {
      setFormError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (
      !confirm(
        `Delete race "${title}"? This only works if there are no participants.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/races/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Delete failed");
        return;
      }
      fetchRaces();
    } catch {
      alert("Delete failed");
    }
  }

  async function handleDistribute(id: string) {
    if (!confirm("Distribute prizes for this race? This cannot be undone."))
      return;
    try {
      const res = await fetch(`/api/admin/races/${id}/distribute`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Distribution failed");
        return;
      }
      const result = await res.json();
      alert(
        `Prizes distributed! ${result.winnersCount} winners received a total of ${result.totalDistributedHoney?.toLocaleString() ?? 0} Honey`
      );
      fetchRaces();
      setShowDetail(false);
    } catch {
      alert("Distribution failed");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Races</h1>
          <p className="text-sm text-[#6B6D77]">
            Manage daily and monthly earning races
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#F5A623] px-3 py-2 text-sm font-medium text-black hover:bg-[#F5A623]/90"
        >
          <Plus className="h-4 w-4" />
          New Race
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All Types</option>
          <option value="DAILY">Daily</option>
          <option value="MONTHLY">Monthly</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
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
                <th className="px-4 py-3">Race</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Prize Pool</th>
                <th className="px-4 py-3 text-right">Participants</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period</th>
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
              ) : races.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-[#4A4D57]"
                  >
                    No races found
                  </td>
                </tr>
              ) : (
                races.map((r) => {
                  const st = statusStyles[r.status] ?? {
                    color: "text-[#6B6D77]",
                    bg: "bg-[#2A2D37]",
                  };
                  const ended = hasEnded(r);
                  const canDistribute = r.status === "ACTIVE" && ended;
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer transition-colors hover:bg-[#0F1117]/50"
                      onClick={() => {
                        setDetailRace(r);
                        setShowDetail(true);
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-[#F5A623]" />
                          <span className="font-medium text-white">
                            {r.title}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            r.type === "DAILY"
                              ? "bg-blue-400/10 text-blue-400"
                              : "bg-purple-400/10 text-purple-400"
                          }`}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-white">
                        {formatCents(r.prizePoolUsdCents)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-[#8B8D97]">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3" />
                          {r._count?.entries ?? 0}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${st.color} ${st.bg}`}
                        >
                          {r.status}
                        </span>
                        {canDistribute && (
                          <span className="ml-1.5 rounded bg-[#F5A623]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F5A623]">
                            Ended
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                        {formatDate(r.startsAt)} &mdash; {formatDate(r.endsAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canDistribute && (
                            <button
                              onClick={() => handleDistribute(r.id)}
                              title="Distribute prizes"
                              className="rounded-md p-1.5 text-[#F5A623] hover:bg-[#F5A623]/10"
                            >
                              <Award className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(r)}
                            title="Edit"
                            className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id, r.title)}
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
                {editId ? "Edit Race" : "Create Race"}
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
                <FormField label="Type" required>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as "DAILY" | "MONTHLY",
                      })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </FormField>
              )}

              <FormField label="Title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Daily Race #42"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Prize Pool (USD cents)" required>
                <input
                  type="number"
                  value={form.prizePoolUsdCents}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      prizePoolUsdCents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                />
                <div className="mt-1 text-[11px] text-[#4A4D57]">
                  {formatCents(form.prizePoolUsdCents || 0)}
                </div>
              </FormField>

              <FormField label="Prize Distribution (JSON)" required>
                <textarea
                  value={form.prizeDistribution}
                  onChange={(e) =>
                    setForm({ ...form, prizeDistribution: e.target.value })
                  }
                  rows={4}
                  placeholder='[{"rank":1,"amount":500},{"rank":2,"amount":300}]'
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 font-mono text-xs text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
                <div className="mt-1 text-[11px] text-[#4A4D57]">
                  Array of &#123;rank, amount&#125; where amount is in USD cents
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Starts At" required>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm({ ...form, startsAt: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
                <FormField label="Ends At" required>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) =>
                      setForm({ ...form, endsAt: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
              </div>

              {editId && (
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as
                          | "ACTIVE"
                          | "FINALIZING"
                          | "COMPLETED",
                      })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="FINALIZING">Finalizing</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </FormField>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    saving || !form.title || !form.startsAt || !form.endsAt
                  }
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

      {/* Detail Modal */}
      <RaceDetailModal
        race={detailRace}
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setDetailRace(null);
        }}
        onDistribute={handleDistribute}
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
