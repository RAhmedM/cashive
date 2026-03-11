"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Star,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  GripVertical,
} from "lucide-react";

// ---- Types ----

interface FeaturedOffer {
  id: string;
  title: string;
  requirement: string;
  providerName: string;
  providerLogoUrl: string | null;
  posterImageUrl: string | null;
  appIconUrl: string | null;
  rewardHoney: number;
  externalUrl: string | null;
  category: string;
  completions: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  title: "",
  requirement: "",
  providerName: "",
  providerLogoUrl: "",
  posterImageUrl: "",
  appIconUrl: "",
  rewardHoney: 0,
  externalUrl: "",
  category: "",
  completions: 0,
  isActive: true,
  sortOrder: 0,
};

// ---- Component ----

export default function AdminFeaturedOffersPage() {
  const [offers, setOffers] = useState<FeaturedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/offers/featured", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setOffers(json.offers);
    } catch {
      setError("Failed to load featured offers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(o: FeaturedOffer) {
    setEditId(o.id);
    setForm({
      title: o.title,
      requirement: o.requirement,
      providerName: o.providerName,
      providerLogoUrl: o.providerLogoUrl ?? "",
      posterImageUrl: o.posterImageUrl ?? "",
      appIconUrl: o.appIconUrl ?? "",
      rewardHoney: o.rewardHoney,
      externalUrl: o.externalUrl ?? "",
      category: o.category,
      completions: o.completions,
      isActive: o.isActive,
      sortOrder: o.sortOrder,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const body = {
        title: form.title,
        requirement: form.requirement,
        providerName: form.providerName,
        providerLogoUrl: form.providerLogoUrl || undefined,
        posterImageUrl: form.posterImageUrl || undefined,
        appIconUrl: form.appIconUrl || undefined,
        rewardHoney: form.rewardHoney,
        externalUrl: form.externalUrl || undefined,
        category: form.category,
        completions: form.completions,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      };

      const isEdit = editId !== null;
      const url = isEdit
        ? `/api/admin/offers/featured/${editId}`
        : "/api/admin/offers/featured";

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
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
      await fetchOffers();
    } catch {
      setFormError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/offers/featured/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Delete failed");
        return;
      }
      await fetchOffers();
    } catch {
      alert("Delete failed");
    }
  }

  async function toggleActive(o: FeaturedOffer) {
    try {
      await fetch(`/api/admin/offers/featured/${o.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !o.isActive }),
      });
      await fetchOffers();
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Featured Offers</h1>
          <p className="text-sm text-[#6B6D77]">
            Curated offers displayed on the Earn page
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#F5A623]/10 px-3 py-2 text-sm font-medium text-[#F5A623] hover:bg-[#F5A623]/20"
        >
          <Plus className="h-4 w-4" />
          Add Offer
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Offers Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                <th className="px-4 py-3 w-8">#</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Reward</th>
                <th className="px-4 py-3 text-right">Completions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#4A4D57]">
                    No featured offers
                  </td>
                </tr>
              ) : (
                offers.map((o) => (
                  <tr
                    key={o.id}
                    className={`transition-colors hover:bg-[#0F1117]/50 ${
                      !o.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-[#4A4D57]">
                      <GripVertical className="h-3.5 w-3.5" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {o.appIconUrl ? (
                          <img
                            src={o.appIconUrl}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F1117]">
                            <Star className="h-4 w-4 text-[#6B6D77]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white max-w-[200px]">
                            {o.title}
                          </div>
                          <div className="truncate text-[11px] text-[#4A4D57] max-w-[200px]">
                            {o.requirement}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#8B8D97]">
                      {o.providerName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="rounded bg-[#0F1117] px-1.5 py-0.5 text-[11px] text-[#8B8D97]">
                        {o.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-green-400">
                      {o.rewardHoney.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-[#8B8D97]">
                      {o.completions.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <button
                        onClick={() => toggleActive(o)}
                        className={`flex items-center gap-1 text-xs ${
                          o.isActive ? "text-green-400" : "text-[#4A4D57]"
                        }`}
                      >
                        {o.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        {o.isActive ? "Active" : "Off"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(o)}
                          className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(o.id, o.title)}
                          className="rounded-md p-1.5 text-[#6B6D77] hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
              <h3 className="text-sm font-semibold text-white">
                {editId ? "Edit Featured Offer" : "Add Featured Offer"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#6B6D77] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <FormField label="Title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Play Royal Match & Reach Level 50"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Requirement" required>
                <input
                  type="text"
                  value={form.requirement}
                  onChange={(e) =>
                    setForm({ ...form, requirement: e.target.value })
                  }
                  placeholder="e.g. Reach Level 50 within 14 days"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Provider Name" required>
                  <input
                    type="text"
                    value={form.providerName}
                    onChange={(e) =>
                      setForm({ ...form, providerName: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>

                <FormField label="Category" required>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="e.g. Game, Survey, App"
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                    min={1}
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>

                <FormField label="Completions">
                  <input
                    type="number"
                    value={form.completions}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        completions: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>

                <FormField label="Sort Order">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
              </div>

              <FormField label="App Icon URL">
                <input
                  type="url"
                  value={form.appIconUrl}
                  onChange={(e) =>
                    setForm({ ...form, appIconUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Poster Image URL">
                <input
                  type="url"
                  value={form.posterImageUrl}
                  onChange={(e) =>
                    setForm({ ...form, posterImageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Provider Logo URL">
                <input
                  type="url"
                  value={form.providerLogoUrl}
                  onChange={(e) =>
                    setForm({ ...form, providerLogoUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="External URL">
                <input
                  type="url"
                  value={form.externalUrl}
                  onChange={(e) =>
                    setForm({ ...form, externalUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Active">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, isActive: !form.isActive })
                  }
                  className={`flex items-center gap-2 rounded-lg border border-[#2A2D37] px-3 py-2 text-sm ${
                    form.isActive ? "text-green-400" : "text-[#6B6D77]"
                  }`}
                >
                  {form.isActive ? (
                    <ToggleRight className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                  {form.isActive ? "Active" : "Inactive"}
                </button>
              </FormField>

              {formError && (
                <div className="text-center text-xs text-red-400">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title || !form.requirement || !form.providerName || !form.category || form.rewardHoney < 1}
                  className="rounded-lg bg-[#F5A623]/10 px-4 py-1.5 text-sm font-medium text-[#F5A623] hover:bg-[#F5A623]/20 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
      <label className="mb-1 block text-xs text-[#6B6D77]">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {children}
    </div>
  );
}
