"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  Settings,
  Save,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react";

// ---- Types ----

interface PlatformSetting {
  key: string;
  value: string;
  type: string;
  category: string;
  description: string;
  updatedAt: string;
  admin: { id: string; name: string } | null;
}

// ---- Helpers ----

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_ORDER = ["GENERAL", "WITHDRAWALS", "RACES", "STREAKS", "VIP", "REFERRALS"];
const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  WITHDRAWALS: "Withdrawals",
  RACES: "Races",
  STREAKS: "Streaks",
  VIP: "VIP",
  REFERRALS: "Referrals",
};

const TYPE_LABELS: Record<string, string> = {
  STRING: "String",
  INT: "Integer",
  FLOAT: "Float",
  BOOLEAN: "Boolean",
  JSON: "JSON",
};

// ---- Setting Row (inline edit) ----

function SettingRow({
  setting,
  onSaved,
}: {
  setting: PlatformSetting;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Derive display value from prop when not editing
  const displayValue = editing ? value : setting.value;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to save");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  function handleCancel() {
    setValue(setting.value);
    setEditing(false);
    setError("");
  }

  function renderInput() {
    if (setting.type === "BOOLEAN") {
      return (
        <select
          value={displayValue}
          onChange={(e) => { setValue(e.target.value); if (!editing) setEditing(true); }}
          className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-1.5 text-sm text-white outline-none focus:border-[#F5A623]/50"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (setting.type === "JSON") {
      return (
        <textarea
          value={displayValue}
          onChange={(e) => { setValue(e.target.value); if (!editing) setEditing(true); }}
          rows={3}
          className="w-full resize-y rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-[#F5A623]/50"
        />
      );
    }

    return (
      <input
        type={setting.type === "INT" || setting.type === "FLOAT" ? "text" : "text"}
        value={displayValue}
        onChange={(e) => { setValue(e.target.value); if (!editing) setEditing(true); }}
        className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-1.5 text-sm text-white outline-none focus:border-[#F5A623]/50"
      />
    );
  }

  return (
    <div className="border-b border-[#2A2D37] px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-white">
              {setting.key}
            </span>
            <span className="rounded bg-[#2A2D37] px-1.5 py-0.5 text-[10px] text-[#6B6D77]">
              {TYPE_LABELS[setting.type] ?? setting.type}
            </span>
            {saved && (
              <span className="flex items-center gap-0.5 text-xs text-green-400">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#6B6D77]">{setting.description}</p>
          <div className="mt-2 max-w-lg">
            {renderInput()}
          </div>
          {error && (
            <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {editing && (
            <div className="flex gap-1">
              <button
                onClick={handleCancel}
                className="rounded px-2 py-1 text-xs text-[#6B6D77] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-[#F5A623] px-2.5 py-1 text-xs font-medium text-black hover:bg-[#F5A623]/90 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                Save
              </button>
            </div>
          )}
          <div className="text-right text-[10px] text-[#4A4D57]">
            {setting.admin?.name && (
              <span>by {setting.admin.name} &middot; </span>
            )}
            {formatDateTime(setting.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Create Setting Modal ----

function CreateSettingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    key: "",
    value: "",
    type: "STRING",
    category: "GENERAL",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to create setting");
        setLoading(false);
        return;
      }
      setForm({ key: "", value: "", type: "STRING", category: "GENERAL", description: "" });
      onCreated();
      onClose();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Create Setting</h3>
          <button onClick={onClose} className="text-[#6B6D77] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Key</label>
            <input
              type="text"
              required
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="e.g. withdrawals.min_amount_cents"
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="STRING">String</option>
                <option value="INT">Integer</option>
                <option value="FLOAT">Float</option>
                <option value="BOOLEAN">Boolean</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Value</label>
            <input
              type="text"
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this setting control?"
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-[#F5A623] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#F5A623]/90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function SystemSettingsPage() {
  const [grouped, setGrouped] = useState<Record<string, PlatformSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGrouped(json.grouped ?? {});
    } catch {
      setGrouped({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const totalSettings = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-[#F5A623]" />
          <h1 className="text-lg font-semibold text-white">System Settings</h1>
          <span className="text-sm text-[#6B6D77]">{totalSettings} settings</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[#2A2D37] px-3 py-1.5 text-xs font-medium text-[#8B8D97] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Setting
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
        </div>
      ) : totalSettings === 0 ? (
        <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] py-12 text-center text-sm text-[#4A4D57]">
          No settings configured yet
        </div>
      ) : (
        CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
          <div
            key={cat}
            className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]"
          >
            <div className="border-b border-[#2A2D37] bg-[#0F1117]/50 px-4 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B8D97]">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
            </div>
            {grouped[cat].map((setting) => (
              <SettingRow
                key={setting.key}
                setting={setting}
                onSaved={fetchSettings}
              />
            ))}
          </div>
        ))
      )}

      <CreateSettingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchSettings}
      />
    </div>
  );
}
