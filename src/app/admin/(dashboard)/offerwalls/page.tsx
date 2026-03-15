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
  ScrollText,
  Play,
  ChevronLeft,
  ChevronRight,
  Loader2,
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

interface PostbackLog {
  id: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  rawUrl: string;
  sourceIp: string;
  result: string;
  errorDetail: string | null;
  userId: string | null;
  username: string | null;
  externalTxId: string | null;
  processingMs: number | null;
  createdAt: string;
}

const PROVIDER_TYPES = ["OFFERWALL", "SURVEY_WALL", "WATCH_WALL"] as const;

const POSTBACK_RESULTS = [
  "CREDITED",
  "DUPLICATE",
  "REJECTED_IP",
  "REJECTED_SIG",
  "REJECTED_USER",
  "ERROR",
] as const;

const resultColors: Record<string, string> = {
  CREDITED: "text-green-400 bg-green-400/10",
  DUPLICATE: "text-yellow-400 bg-yellow-400/10",
  REJECTED_IP: "text-red-400 bg-red-400/10",
  REJECTED_SIG: "text-red-400 bg-red-400/10",
  REJECTED_USER: "text-orange-400 bg-orange-400/10",
  ERROR: "text-red-400 bg-red-400/10",
};

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

  // Postback logs state
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsProviderId, setLogsProviderId] = useState<string | null>(null);
  const [logsProviderName, setLogsProviderName] = useState("");
  const [logs, setLogs] = useState<PostbackLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsFilter, setLogsFilter] = useState("");
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  // Test postback state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    providerId: "",
    userId: "",
    offerName: "",
    payoutCents: 100,
    transactionId: "",
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; body: string } | null>(null);

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

  const fetchLogs = useCallback(
    async (providerId: string, page: number, result: string) => {
      setLogsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (providerId) params.set("providerId", providerId);
        if (result) params.set("result", result);
        const res = await fetch(`/api/admin/postback-logs?${params}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load logs");
        const json = await res.json();
        setLogs(json.logs);
        setLogsTotal(json.total);
        setLogsTotalPages(json.totalPages);
      } catch {
        setLogs([]);
      } finally {
        setLogsLoading(false);
      }
    },
    []
  );

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

  function openLogs(p: Provider) {
    setLogsProviderId(p.id);
    setLogsProviderName(p.name);
    setLogsPage(1);
    setLogsFilter("");
    setShowLogsModal(true);
    fetchLogs(p.id, 1, "");
  }

  function openTestPostback() {
    setTestForm({
      providerId: providers[0]?.slug ?? "",
      userId: "",
      offerName: "Test Offer",
      payoutCents: 100,
      transactionId: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    setTestResult(null);
    setShowTestModal(true);
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

  async function handleTestPostback() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const p = new URLSearchParams({
        sub_id: testForm.userId,
        payout: (testForm.payoutCents / 100).toFixed(2),
        txn_id: testForm.transactionId,
        offer: testForm.offerName,
        offer_id: "test-offer-id",
        type: "credit",
        hash: "test-skip-sig",
      });
      const res = await fetch(`/api/postback/${testForm.providerId}?${p}`);
      const body = await res.text();
      setTestResult({ ok: res.ok, body });
    } catch (e) {
      setTestResult({ ok: false, body: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setTestLoading(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={openTestPostback}
            className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/20"
          >
            <Play className="h-4 w-4" />
            Test Postback
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-[#F5A623]/10 px-3 py-2 text-sm font-medium text-[#F5A623] hover:bg-[#F5A623]/20"
          >
            <Plus className="h-4 w-4" />
            Add Provider
          </button>
        </div>
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
                  onClick={() => openLogs(p)}
                  title="View Postback Logs"
                  className="rounded-md p-1.5 text-[#6B6D77] hover:bg-[#0F1117] hover:text-white"
                >
                  <ScrollText className="h-4 w-4" />
                </button>
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

      {/* Postback Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Postback Logs — {logsProviderName}
                </h3>
                <p className="text-xs text-[#6B6D77]">
                  {logsTotal} total log{logsTotal !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-[#6B6D77] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 border-b border-[#2A2D37] px-5 py-2">
              <span className="text-xs text-[#6B6D77]">Filter:</span>
              <button
                onClick={() => {
                  setLogsFilter("");
                  setLogsPage(1);
                  fetchLogs(logsProviderId!, 1, "");
                }}
                className={`rounded-md px-2 py-1 text-xs ${
                  logsFilter === ""
                    ? "bg-[#F5A623]/10 text-[#F5A623]"
                    : "text-[#6B6D77] hover:text-white"
                }`}
              >
                All
              </button>
              {POSTBACK_RESULTS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setLogsFilter(r);
                    setLogsPage(1);
                    fetchLogs(logsProviderId!, 1, r);
                  }}
                  className={`rounded-md px-2 py-1 text-xs ${
                    logsFilter === r
                      ? "bg-[#F5A623]/10 text-[#F5A623]"
                      : "text-[#6B6D77] hover:text-white"
                  }`}
                >
                  {r.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* Logs table */}
            <div className="flex-1 overflow-auto">
              {logsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#F5A623]" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-[#4A4D57]">
                  No postback logs found
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">User</th>
                      <th className="px-4 py-2.5">External TX ID</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5">Source IP</th>
                      <th className="px-4 py-2.5 text-right">Processing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2D37]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0F1117]/50">
                        <td className="whitespace-nowrap px-4 py-2 text-xs text-[#8B8D97]">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          {log.username ? (
                            <a
                              href={`/admin/users/${log.userId}`}
                              className="text-sm text-[#F5A623] hover:underline"
                            >
                              {log.username}
                            </a>
                          ) : (
                            <span className="text-xs text-[#4A4D57]">
                              {log.userId ? log.userId.slice(0, 8) + "..." : "—"}
                            </span>
                          )}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-2 font-mono text-xs text-[#6B6D77]">
                          {log.externalTxId ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              resultColors[log.result] ?? "text-[#6B6D77] bg-[#2A2D37]"
                            }`}
                          >
                            {log.result.replace(/_/g, " ")}
                          </span>
                          {log.errorDetail && (
                            <span
                              className="ml-1.5 text-[10px] text-[#4A4D57]"
                              title={log.errorDetail}
                            >
                              {log.errorDetail.length > 30
                                ? log.errorDetail.slice(0, 30) + "..."
                                : log.errorDetail}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-[#6B6D77]">
                          {log.sourceIp}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-[#6B6D77]">
                          {log.processingMs != null ? `${log.processingMs}ms` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#2A2D37] px-5 py-2">
                <span className="text-xs text-[#6B6D77]">
                  Page {logsPage} of {logsTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => {
                      const p = logsPage - 1;
                      setLogsPage(p);
                      fetchLogs(logsProviderId!, p, logsFilter);
                    }}
                    className="rounded-md p-1 text-[#6B6D77] hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={logsPage >= logsTotalPages}
                    onClick={() => {
                      const p = logsPage + 1;
                      setLogsPage(p);
                      fetchLogs(logsProviderId!, p, logsFilter);
                    }}
                    className="rounded-md p-1 text-[#6B6D77] hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Postback Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
              <h3 className="text-sm font-semibold text-white">Test Postback</h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-[#6B6D77] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <FormField label="Provider" required>
                <select
                  value={testForm.providerId}
                  onChange={(e) =>
                    setTestForm({ ...testForm, providerId: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
                >
                  {providers.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="User ID" required>
                <input
                  type="text"
                  value={testForm.userId}
                  onChange={(e) =>
                    setTestForm({ ...testForm, userId: e.target.value })
                  }
                  placeholder="Paste a user ID"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Offer Name">
                <input
                  type="text"
                  value={testForm.offerName}
                  onChange={(e) =>
                    setTestForm({ ...testForm, offerName: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Payout (cents)">
                <input
                  type="number"
                  value={testForm.payoutCents}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      payoutCents: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
                />
              </FormField>

              <FormField label="Transaction ID">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testForm.transactionId}
                    onChange={(e) =>
                      setTestForm({ ...testForm, transactionId: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#F5A623]/50"
                  />
                  <button
                    onClick={() =>
                      setTestForm({
                        ...testForm,
                        transactionId: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      })
                    }
                    className="shrink-0 rounded-lg bg-[#0F1117] px-2.5 py-2 text-xs text-[#6B6D77] hover:text-white"
                    title="Generate new"
                  >
                    New
                  </button>
                </div>
              </FormField>

              {testResult && (
                <div
                  className={`rounded-lg border p-3 text-xs font-mono ${
                    testResult.ok
                      ? "border-green-500/30 bg-green-500/5 text-green-400"
                      : "border-red-500/30 bg-red-500/5 text-red-400"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-sans font-medium uppercase tracking-wider">
                    Response
                  </div>
                  {testResult.body}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={handleTestPostback}
                  disabled={testLoading || !testForm.userId || !testForm.providerId}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50"
                >
                  {testLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Send Postback
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
