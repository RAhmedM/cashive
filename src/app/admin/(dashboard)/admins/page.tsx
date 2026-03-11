"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  Shield,
  Plus,
  Key,
  UserCheck,
  UserX,
  Edit2,
} from "lucide-react";

// ---- Types ----

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count?: { auditLogs: number };
}

// ---- Helpers ----

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  SUPPORT_AGENT: "Support Agent",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/10 text-red-400",
  ADMIN: "bg-amber-500/10 text-amber-400",
  MODERATOR: "bg-blue-500/10 text-blue-400",
  SUPPORT_AGENT: "bg-green-500/10 text-green-400",
};

// ---- Create Admin Modal ----

function CreateAdminModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "SUPPORT_AGENT",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to create admin");
        setLoading(false);
        return;
      }
      setForm({ email: "", name: "", password: "", role: "SUPPORT_AGENT" });
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
          <h3 className="text-sm font-semibold text-white">Create Admin</h3>
          <button onClick={onClose} className="text-[#6B6D77] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">
              Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="SUPPORT_AGENT">Support Agent</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
            </select>
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

// ---- Edit Admin Modal ----

function EditAdminModal({
  admin,
  onClose,
  onUpdated,
}: {
  admin: AdminUser;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(admin.name);
  const [role, setRole] = useState(admin.role);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Cannot edit SUPER_ADMIN
  if (admin.role === "SUPER_ADMIN") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-full max-w-md rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-5 shadow-xl">
          <p className="text-sm text-[#8B8D97]">
            Super Admin accounts cannot be modified through this interface.
          </p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/admins/${admin!.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to update admin");
        setLoading(false);
        return;
      }
      onUpdated();
      onClose();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/admins/${admin!.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to reset password");
        setLoading(false);
        return;
      }
      setNewPassword("");
      setShowResetPassword(false);
      onUpdated();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function handleToggleActive() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/admins/${admin!.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !admin!.isActive }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to update");
        setLoading(false);
        return;
      }
      onUpdated();
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
          <h3 className="text-sm font-semibold text-white">Edit Admin</h3>
          <button onClick={onClose} className="text-[#6B6D77] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="text-xs text-[#6B6D77]">
            {admin.email}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none focus:border-[#F5A623]/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="SUPPORT_AGENT">Support Agent</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-[#8B8D97] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-[#F5A623] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#F5A623]/90 disabled:opacity-50"
            >
              Save
            </button>
          </div>

          {/* Separator */}
          <div className="border-t border-[#2A2D37]" />

          {/* Password reset */}
          {!showResetPassword ? (
            <button
              onClick={() => setShowResetPassword(true)}
              className="flex items-center gap-1.5 text-xs text-[#8B8D97] hover:text-white"
            >
              <Key className="h-3.5 w-3.5" />
              Reset Password
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#8B8D97]">
                New Password
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="flex-1 rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-1.5 text-sm text-white outline-none"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-[#4A4D57]">
                This will force logout the admin from all sessions.
              </p>
            </div>
          )}

          {/* Activate / Deactivate */}
          <button
            onClick={handleToggleActive}
            disabled={loading}
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50 ${
              admin.isActive
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            }`}
          >
            {admin.isActive ? (
              <>
                <UserX className="h-3.5 w-3.5" />
                Deactivate Account
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Reactivate Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins", { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAdmins(json.admins);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const activeCount = admins.filter((a) => a.isActive).length;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[#F5A623]" />
          <h1 className="text-lg font-semibold text-white">Admin Management</h1>
          <span className="text-sm text-[#6B6D77]">
            {activeCount} active / {admins.length} total
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#F5A623] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#F5A623]/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Admin
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#2A2D37] text-xs text-[#6B6D77]">
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">2FA</th>
              <th className="px-4 py-3 font-medium">Last Login</th>
              <th className="px-4 py-3 font-medium">Actions</th>
              <th className="px-4 py-3 font-medium text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                  </div>
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[#4A4D57]">
                  No admin users found
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b border-[#2A2D37] last:border-b-0 hover:bg-[#0F1117]/50 ${
                    !a.isActive ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{a.name}</div>
                    <div className="text-xs text-[#6B6D77]">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[a.role] ?? "bg-[#2A2D37] text-[#8B8D97]"}`}
                    >
                      {ROLE_LABELS[a.role] ?? a.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.isActive ? (
                      <span className="text-xs text-green-400">Active</span>
                    ) : (
                      <span className="text-xs text-red-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.totpEnabled ? (
                      <span className="text-xs text-green-400">Enabled</span>
                    ) : (
                      <span className="text-xs text-[#4A4D57]">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B8D97]">
                    {a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B6D77]">
                    {a._count?.auditLogs ?? 0} actions
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => setEditAdmin(a)}
                        className="rounded p-1 text-[#6B6D77] hover:bg-[#2A2D37] hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <CreateAdminModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchAdmins}
      />
      {editAdmin && (
        <EditAdminModal
          key={editAdmin.id}
          admin={editAdmin}
          onClose={() => setEditAdmin(null)}
          onUpdated={fetchAdmins}
        />
      )}
    </div>
  );
}
