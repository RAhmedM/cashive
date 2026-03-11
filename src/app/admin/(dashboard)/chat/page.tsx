"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  VolumeX,
  Volume2,
  AlertTriangle,
  MessageSquare,
  Flag,
  CheckCircle,
  XCircle,
} from "lucide-react";

// ---- Types ----

interface ChatUser {
  id: string;
  username: string;
  email: string;
  chatMuted: boolean;
  chatMutedUntil: string | null;
}

interface ChatMessage {
  id: string;
  userId: string;
  room: string;
  content: string;
  isSystemMessage: boolean;
  isDeleted: boolean;
  deletedBy: string | null;
  createdAt: string;
  user: ChatUser;
  reports: { id: string }[];
}

interface ChatReport {
  id: string;
  messageId: string;
  reportedBy: string;
  reason: string;
  detail: string | null;
  status: string;
  reviewedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
  message: ChatMessage;
  reporter: { id: string; username: string };
  reviewer: { id: string; name: string } | null;
}

interface MutedUser {
  id: string;
  username: string;
  email: string;
  chatMuted: boolean;
  chatMutedUntil: string | null;
}

type Tab = "reports" | "messages" | "muted";

const MUTE_DURATIONS = [
  { label: "10 min", value: 10 },
  { label: "1 hour", value: 60 },
  { label: "24 hours", value: 1440 },
  { label: "7 days", value: 10080 },
  { label: "Permanent", value: 0 },
];

// ---- Helpers ----

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function muteTimeLeft(until: string | null): string {
  if (!until) return "Permanent";
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

const reasonLabels: Record<string, string> = {
  SPAM: "Spam",
  ABUSE: "Abuse",
  HARASSMENT: "Harassment",
  OTHER: "Other",
};

// ---- Mute Modal ----

function MuteModal({
  open,
  userId,
  username,
  onClose,
  onDone,
}: {
  open: boolean;
  userId: string;
  username: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleMute() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chat/muted-users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "mute",
          ...(duration > 0 ? { durationMinutes: duration } : {}),
        }),
      });
      if (res.ok) {
        onDone();
        onClose();
      }
    } catch {}
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-[#2A2D37] bg-[#1A1D27] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2A2D37] px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Mute User</h3>
          <button onClick={onClose} className="text-[#6B6D77] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="text-sm text-[#8B8D97]">
            Mute <span className="font-medium text-white">{username}</span> from chat
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#8B8D97]">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white outline-none"
            >
              {MUTE_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
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
              disabled={loading}
              onClick={handleMute}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              <VolumeX className="h-3.5 w-3.5" />
              Mute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Reports Tab ----

function ReportsTab() {
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page + 1));
      params.set("limit", "50");
      const res = await fetch(`/api/admin/chat/reports?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setReports(json.reports);
      setTotal(json.total);
      setPendingCount(json.pendingCount);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleReview(
    reportId: string,
    action: "review" | "dismiss",
    deleteMessage: boolean,
    muteUser: boolean,
    muteDurationMinutes?: number
  ) {
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/admin/chat/reports/${reportId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          deleteMessage,
          muteUser,
          muteDurationMinutes,
        }),
      });
      if (res.ok) fetchReports();
    } catch {}
    setActionLoading(null);
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="PENDING">Pending ({pendingCount})</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="">All</option>
        </select>
        <div className="ml-auto text-xs text-[#6B6D77]">{total} reports</div>
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4A4D57]">
            No reports found
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-[#2A2D37] bg-[#1A1D27] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Reported message */}
                  <div className="mb-2 rounded-lg bg-[#0F1117] p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <a
                        href={`/admin/users/${r.message.userId}`}
                        className="text-sm font-medium text-[#F5A623] hover:underline"
                      >
                        {r.message.user.username}
                      </a>
                      <span className="text-[10px] text-[#4A4D57]">
                        in #{r.message.room}
                      </span>
                      <span className="text-[10px] text-[#4A4D57]">
                        {formatDateTime(r.message.createdAt)}
                      </span>
                      {r.message.isDeleted && (
                        <span className="rounded bg-red-400/10 px-1 py-0.5 text-[10px] text-red-400">
                          Deleted
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${r.message.isDeleted ? "text-[#4A4D57] line-through" : "text-white"}`}>
                      {r.message.content}
                    </div>
                  </div>

                  {/* Report info */}
                  <div className="flex items-center gap-3 text-xs text-[#6B6D77]">
                    <span>
                      Reported by{" "}
                      <span className="text-[#8B8D97]">{r.reporter.username}</span>
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        r.reason === "HARASSMENT"
                          ? "bg-red-400/10 text-red-400"
                          : r.reason === "ABUSE"
                            ? "bg-orange-400/10 text-orange-400"
                            : r.reason === "SPAM"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-[#2A2D37] text-[#6B6D77]"
                      }`}
                    >
                      {reasonLabels[r.reason] || r.reason}
                    </span>
                    {r.detail && <span className="truncate">{r.detail}</span>}
                    <span>{formatDateTime(r.createdAt)}</span>
                  </div>

                  {r.reviewer && (
                    <div className="mt-1 text-[11px] text-[#4A4D57]">
                      Reviewed by {r.reviewer.name} at{" "}
                      {r.reviewedAt ? formatDateTime(r.reviewedAt) : ""}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {r.status === "PENDING" && (
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => handleReview(r.id, "review", true, false)}
                      className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Msg
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() =>
                        handleReview(r.id, "review", true, true, 60)
                      }
                      className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 text-[11px] font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      <VolumeX className="h-3 w-3" />
                      Delete + Mute 1h
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => handleReview(r.id, "dismiss", false, false)}
                      className="flex items-center gap-1 rounded-md bg-[#2A2D37] px-2 py-1 text-[11px] font-medium text-[#8B8D97] hover:text-white disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
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
  );
}

// ---- Messages Tab ----

function MessagesTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);

  // Mute modal
  const [muteTarget, setMuteTarget] = useState<{ id: string; username: string } | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page + 1));
      params.set("limit", "50");
      const res = await fetch(`/api/admin/chat/messages?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setMessages(json.messages);
      setTotal(json.total);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleDeleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/admin/chat/messages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) fetchMessages();
    } catch {}
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A4D57]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(0);
              }
            }}
            placeholder="Search messages..."
            className="w-full rounded-lg border border-[#2A2D37] bg-[#1A1D27] py-2 pl-9 pr-3 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
          />
        </div>
        <div className="text-xs text-[#6B6D77]">{total} messages</div>
      </div>

      {/* Messages table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#4A4D57]">
                    No messages found
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-[#0F1117]/50">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <a
                        href={`/admin/users/${m.userId}`}
                        className="text-sm font-medium text-white hover:text-[#F5A623]"
                      >
                        {m.user.username}
                      </a>
                      {m.user.chatMuted && (
                        <span className="ml-1.5 rounded bg-red-400/10 px-1 py-0.5 text-[10px] text-red-400">
                          Muted
                        </span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-2.5">
                      <div
                        className={`truncate text-sm ${m.isDeleted ? "text-[#4A4D57] line-through" : "text-[#C8C9CE]"}`}
                      >
                        {m.content}
                      </div>
                      {m.reports.length > 0 && (
                        <span className="rounded bg-orange-400/10 px-1 py-0.5 text-[10px] text-orange-400">
                          {m.reports.length} report{m.reports.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                      #{m.room}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {!m.isDeleted && (
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            title="Delete message"
                            className="rounded-md p-1.5 text-[#6B6D77] hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!m.user.chatMuted && (
                          <button
                            onClick={() =>
                              setMuteTarget({
                                id: m.userId,
                                username: m.user.username,
                              })
                            }
                            title="Mute user"
                            className="rounded-md p-1.5 text-[#6B6D77] hover:bg-orange-500/10 hover:text-orange-400"
                          >
                            <VolumeX className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      <MuteModal
        open={!!muteTarget}
        userId={muteTarget?.id ?? ""}
        username={muteTarget?.username ?? ""}
        onClose={() => setMuteTarget(null)}
        onDone={fetchMessages}
      />
    </div>
  );
}

// ---- Muted Users Tab ----

function MutedUsersTab() {
  const [users, setUsers] = useState<MutedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("limit", "50");
      const res = await fetch(`/api/admin/chat/muted-users?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json.users);
      setTotal(json.total);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleUnmute(userId: string) {
    try {
      const res = await fetch("/api/admin/chat/muted-users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "unmute" }),
      });
      if (res.ok) fetchUsers();
    } catch {}
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="mb-4 text-xs text-[#6B6D77]">{total} muted users</div>
      <div className="overflow-hidden rounded-xl border border-[#2A2D37] bg-[#1A1D27]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2A2D37] text-[11px] font-medium uppercase tracking-wider text-[#6B6D77]">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-[#4A4D57]">
                    No muted users
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-[#0F1117]/50">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <a
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-white hover:text-[#F5A623]"
                      >
                        {u.username}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B6D77]">
                      {u.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          u.chatMutedUntil
                            ? "bg-yellow-400/10 text-yellow-400"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {muteTimeLeft(u.chatMutedUntil)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <button
                        onClick={() => handleUnmute(u.id)}
                        className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1 text-[11px] font-medium text-green-400 hover:bg-green-500/20"
                      >
                        <Volume2 className="h-3 w-3" />
                        Unmute
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}

// ---- Main Component ----

export default function AdminChatModerationPage() {
  const [tab, setTab] = useState<Tab>("reports");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "reports", label: "Flagged Messages", icon: <Flag className="h-4 w-4" /> },
    { id: "messages", label: "All Messages", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "muted", label: "Muted Users", icon: <VolumeX className="h-4 w-4" /> },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Chat Moderation</h1>
        <p className="text-sm text-[#6B6D77]">
          Review reports, moderate messages, and manage muted users
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b border-[#2A2D37]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-[#F5A623] text-[#F5A623]"
                : "border-transparent text-[#6B6D77] hover:text-[#8B8D97]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "reports" && <ReportsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "muted" && <MutedUsersTab />}
    </div>
  );
}
