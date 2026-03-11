"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Globe,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

// ---- Types ----

interface Provider {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  bonusBadgePct: number;
  isActive: boolean;
  type: string;
  iframeBaseUrl: string | null;
  revenueSharePct: number;
  postbackIps: string[];
  postbackSecretMasked: string;
  totalCompletions: number;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_TYPES = ["OFFERWALL", "SURVEY_WALL", "WATCH_WALL"] as const;

const emptyForm = {
  slug: "",
  name: "",
  logoUrl: "",
  postbackSecret: "",
  postbackIps: "",
  bonusBadgePct: 0,
  isActive: true,
  type: "OFFERWALL" as string,
  iframeBaseUrl: "",
  revenueSharePct: 80,
};

// ---- Component ----

export default function AdminOfferwallsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/offers/providers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setProviders(json.providers);
    } catch {
      setError("Failed to load offerwall providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(p: Provider) {
    setEditId(p.id);
    setForm({
      slug: p.slug,
      name: p.name,
      logoUrl: p.logoUrl ?? "",
      postbackSecret: "",
      postbackIps: p.postbackIps.join(", "),
      bonusBadgePct: p.bonusBadgePct,
      isActive: p.isActive,
      type: p.type,
      iframeBaseUrl: p.iframeBaseUrl ?? "",
      revenueSharePct: p.revenueSharePct,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        slug: form.slug,
        name: form.name,
        logoUrl: form.logoUrl || undefined,
        postbackIps: form.postbackIps
          ? form.postbackIps.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        bonusBadgePct: form.bonusBadgePct,
        isActive: form.isActive,
        type: form.type,
        iframeBaseUrl: form.iframeBaseUrl || undefined,
        revenueSharePct: form.revenueSharePct,
      };

      if (form.postbackSecret) {
        body.postbackSecret = form.postbackSecret;
      }

      const isEdit = editId !== null;
      const url = isEdit
        ? `/api/admin/offers/providers/${editId}`
        : "/api/admin/offers/providers";

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
      await fetchProviders();
    } catch {
      setFormError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete provider "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/offers/providers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Delete failed");
        return;
      }
      await fetchProviders();
    } catch {
      alert("Delete failed");
    }
  }

  async function toggleActive(p: Provider) {
    try {
      await fetch(`/api/admin/offers/providers/${p.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      await fetchProviders();
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
          <h1 className="text-xl font-semibold text-white">Offerwalls</h1>
          <p className="text-sm text-[#6B6D77]">
            Manage offerwall provider integrations
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#F5A623]/10 px-3 py-2 text-sm font-medium text-[#F5A623] hover:bg-[#F5A623]/20"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border bg-[#1A1D27] p-4 ${
              p.isActive ? "border-[#2A2D37]" : "border-[#2A2D37]/50 opacity-60"
            }`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F1117]">
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt={p.name}
                      className="h-6 w-6 rounded object-contain"
                    />
                  ) : (
                    <Globe className="h-5 w-5 text-[#6B6D77]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{p.name}</span>
                    <span className="rounded bg-[#0F1117] px-1.5 py-0.5 text-[10px] text-[#6B6D77]">
                      {p.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#4A4D57]">
                    <span>{p.type.replace("_", " ")}</span>
                    <span>&middot;</span>
                    <span>{p.totalCompletions.toLocaleString()} completions</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(p)}
                  title={p.isActive ? "Deactivate" : "Activate"}
                  className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                >
                  {p.isActive ? (
                    <ToggleRight className="h-4 w-4 text-green-400" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="rounded-md p-1.5 text-[#6B6D77] hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[#4A4D57]">Revenue Share</div>
                <div className="text-white">{p.revenueSharePct}%</div>
              </div>
              <div>
                <div className="text-[#4A4D57]">Bonus Badge</div>
                <div className="text-white">
                  {p.bonusBadgePct > 0 ? `+${p.bonusBadgePct}%` : "None"}
                </div>
              </div>
              <div>
                <div className="text-[#4A4D57]">Secret</div>
                <div className="font-mono text-[#6B6D77]">
                  {p.postbackSecretMasked}
                </div>
              </div>
            </div>

            {p.postbackIps.length > 0 && (
              <div className="mt-2 text-xs text-[#4A4D57]">
                IPs: {p.postbackIps.join(", ")}
              </div>
            )}
          </div>
        ))}

        {providers.length === 0 && (
          <div className="col-span-full rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-12 text-center text-sm text-[#4A4D57]">
            No offerwall providers configured
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
              <h3 className="text-sm font-semibold text-white">
                {editId ? "Edit Provider" : "Add Provider"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#6B6D77] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <FormField label="Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Slug" required>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  placeholder="e.g. lootably"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
                  >
                    {PROVIDER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Revenue Share %">
                  <input
                    type="number"
                    value={form.revenueSharePct}
                    onChange={(e) =>
                      setForm({ ...form, revenueSharePct: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    max={100}
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                </FormField>
              </div>

              <FormField label="Logo URL">
                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="iFrame Base URL">
                <input
                  type="url"
                  value={form.iframeBaseUrl}
                  onChange={(e) =>
                    setForm({ ...form, iframeBaseUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField
                label={editId ? "Postback Secret (leave blank to keep current)" : "Postback Secret"}
                required={!editId}
              >
                <input
                  type="text"
                  value={form.postbackSecret}
                  onChange={(e) =>
                    setForm({ ...form, postbackSecret: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Postback IPs (comma-separated)">
                <input
                  type="text"
                  value={form.postbackIps}
                  onChange={(e) =>
                    setForm({ ...form, postbackIps: e.target.value })
                  }
                  placeholder="1.2.3.4, 5.6.7.8"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Bonus Badge %">
                  <input
                    type="number"
                    value={form.bonusBadgePct}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bonusBadgePct: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
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
              </div>

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
                  disabled={saving || !form.name || !form.slug}
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
