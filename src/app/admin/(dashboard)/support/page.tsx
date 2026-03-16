"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  Clock,
  AlertTriangle,
  Tag,
  ArrowLeft,
  CheckCircle,
  Circle,
  Paperclip,
} from "lucide-react";

// ---- Types ----

interface TicketUser {
  id: string;
  username: string;
  email: string;
  vipTier?: string;
  isBanned?: boolean;
}

interface TicketAssignee {
  id: string;
  name: string;
  role?: string;
}

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  relatedOfferId: string | null;
  relatedWithdrawalId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  user: TicketUser;
  assignee: TicketAssignee | null;
  _count?: { messages: number };
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  isAdmin: boolean;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}

interface RelatedOffer {
  id: string;
  offerName: string;
  rewardToUserHoney: number;
  status: string;
  createdAt: string;
  provider: { name: string } | null;
}

interface RelatedWithdrawal {
  id: string;
  amountHoney: number;
  amountUsdCents: number;
  method: string;
  status: string;
  createdAt: string;
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

function formatDateShort(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_USER: "Waiting on User",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-400",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400",
  WAITING_USER: "bg-purple-500/10 text-purple-400",
  RESOLVED: "bg-green-500/10 text-green-400",
  CLOSED: "bg-[#2A2D37] text-[#6B6D77]",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-[#6B6D77]",
  NORMAL: "text-[#8B8D97]",
  HIGH: "text-amber-400",
  URGENT: "text-red-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  WITHDRAWAL: "Withdrawal",
  OFFER_NOT_CREDITED: "Offer Not Credited",
  ACCOUNT: "Account",
  KYC: "KYC",
  OTHER: "Other",
};

// ---- Status Badge ----

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-[#2A2D37] text-[#8B8D97]"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: string }) {
  return (
    <span className={`text-xs font-medium ${PRIORITY_COLORS[priority] ?? "text-[#6B6D77]"}`}>
      {priority === "URGENT" && <AlertTriangle className="mr-0.5 inline h-3 w-3" />}
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ---- Ticket List ----

function TicketList({
  onSelect,
  selectedId,
  refreshKey,
}: {
  onSelect: (id: string) => void;
  selectedId: string | null;
  refreshKey: number;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [page, setPage] = useState(0);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (mineOnly) params.set("mine", "true");
      params.set("page", String(page + 1));
      params.set("limit", "50");
      const res = await fetch(`/api/admin/support?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTickets(json.tickets);
      setTotal(json.total);
      setStatusCounts(json.statusCounts ?? {});
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, mineOnly, page, refreshKey]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const totalPages = Math.ceil(total / 50);
  const openCount = (statusCounts.OPEN ?? 0) + (statusCounts.IN_PROGRESS ?? 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#2A2D37] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          Support Tickets
          {openCount > 0 && (
            <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              {openCount} open
            </span>
          )}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#2A2D37] px-4 py-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open ({statusCounts.OPEN ?? 0})</option>
          <option value="IN_PROGRESS">In Progress ({statusCounts.IN_PROGRESS ?? 0})</option>
          <option value="WAITING_USER">Waiting User ({statusCounts.WAITING_USER ?? 0})</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Priority</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-2 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Categories</option>
          <option value="WITHDRAWAL">Withdrawal</option>
          <option value="OFFER_NOT_CREDITED">Offer Not Credited</option>
          <option value="ACCOUNT">Account</option>
          <option value="KYC">KYC</option>
          <option value="OTHER">Other</option>
        </select>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-[#8B8D97]">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => { setMineOnly(e.target.checked); setPage(0); }}
            className="rounded border-[#2A2D37]"
          />
          My tickets
        </label>
      </div>

      {/* Ticket rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4A4D57]">
            No tickets found
          </div>
        ) : (
          tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`w-full border-b border-[#2A2D37] px-4 py-3 text-left transition-colors hover:bg-[#1A1D27] ${
                selectedId === t.id ? "bg-[#1A1D27]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-white">
                  {t.subject}
                </span>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-[#6B6D77]">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {t.user.username}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {CATEGORY_LABELS[t.category] ?? t.category}
                </span>
                <PriorityIndicator priority={t.priority} />
                <span className="ml-auto flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(t.updatedAt)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-[#4A4D57]">
                {t.assignee && (
                  <span>Assigned: {t.assignee.name}</span>
                )}
                {t._count?.messages !== undefined && (
                  <span>{t._count.messages} messages</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#2A2D37] px-4 py-2">
          <span className="text-xs text-[#6B6D77]">{total} tickets</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded p-1 text-[#6B6D77] hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#8B8D97]">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded p-1 text-[#6B6D77] hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Ticket Detail ----

function TicketDetail({
  ticketId,
  onBack,
  onTicketUpdated,
}: {
  ticketId: string;
  onBack: () => void;
  onTicketUpdated?: () => void;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [admins, setAdmins] = useState<TicketAssignee[]>([]);
  const [relatedOffer, setRelatedOffer] = useState<RelatedOffer | null>(null);
  const [relatedWithdrawal, setRelatedWithdrawal] = useState<RelatedWithdrawal | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTicket(json.ticket);
      setMessages(json.ticket.messages ?? []);
      setAdmins(json.admins ?? []);
      setRelatedOffer(json.relatedOffer);
      setRelatedWithdrawal(json.relatedWithdrawal);
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!ticketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/support/${ticketId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        const newMessages: TicketMessage[] = json.ticket.messages ?? [];
        setMessages((prev) => {
          if (newMessages.length === prev.length) return prev;
          return newMessages;
        });
        // Also update ticket metadata (status may have changed)
        setTicket((prev) => {
          if (!prev) return json.ticket;
          if (
            prev.status !== json.ticket.status ||
            prev.priority !== json.ticket.priority ||
            prev.assignedTo !== json.ticket.assignedTo
          ) {
            return json.ticket;
          }
          return prev;
        });
      } catch {
        // Silently fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ticketId]);

  async function handleSendReply() {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.message]);
        setReply("");
        // Refresh ticket to get updated status
        fetchTicket();
        onTicketUpdated?.();
      }
    } catch {}
    setSending(false);
  }

  async function handleUpdateTicket(updates: Record<string, unknown>) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchTicket();
        onTicketUpdated?.();
      }
    } catch {}
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-sm text-[#6B6D77]">Ticket not found</p>
        <button onClick={onBack} className="text-xs text-[#F5A623] hover:underline">
          Back to list
        </button>
      </div>
    );
  }

  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#2A2D37] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-1 text-[#6B6D77] hover:bg-[#2A2D37] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">
              {ticket.subject}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#6B6D77]">
              <span>#{ticket.id.slice(0, 8)}</span>
              <span>&middot;</span>
              <span>{ticket.user.username} ({ticket.user.email})</span>
              <span>&middot;</span>
              <span>{formatDateTime(ticket.createdAt)}</span>
            </div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      {/* Ticket meta / controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#2A2D37] px-4 py-2">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#6B6D77]">Status</label>
          <select
            value={ticket.status}
            onChange={(e) => handleUpdateTicket({ status: e.target.value })}
            disabled={updating}
            className="rounded border border-[#2A2D37] bg-[#0F1117] px-2 py-1 text-xs text-white outline-none disabled:opacity-50"
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_USER">Waiting on User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#6B6D77]">Priority</label>
          <select
            value={ticket.priority}
            onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
            disabled={updating}
            className="rounded border border-[#2A2D37] bg-[#0F1117] px-2 py-1 text-xs text-white outline-none disabled:opacity-50"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Assign */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#6B6D77]">Assigned</label>
          <select
            value={ticket.assignedTo ?? ""}
            onChange={(e) =>
              handleUpdateTicket({
                assignedTo: e.target.value || null,
              })
            }
            disabled={updating}
            className="rounded border border-[#2A2D37] bg-[#0F1117] px-2 py-1 text-xs text-white outline-none disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category + related info */}
        <div className="ml-auto flex items-center gap-2 text-xs text-[#6B6D77]">
          <span className="rounded bg-[#2A2D37] px-2 py-0.5">
            {CATEGORY_LABELS[ticket.category] ?? ticket.category}
          </span>
          {ticket.resolvedAt && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="h-3 w-3" />
              Resolved {formatDateShort(ticket.resolvedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Related entities */}
      {(relatedOffer || relatedWithdrawal) && (
        <div className="flex flex-wrap gap-3 border-b border-[#2A2D37] px-4 py-2">
          {relatedOffer && (
            <div className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-1.5 text-xs">
              <span className="text-[#6B6D77]">Related Offer: </span>
              <span className="text-white">{relatedOffer.offerName}</span>
              <span className="ml-1 text-[#F5A623]">
                {relatedOffer.rewardToUserHoney.toLocaleString()} honey
              </span>
              <span className="ml-1 text-[#6B6D77]">({relatedOffer.status})</span>
            </div>
          )}
          {relatedWithdrawal && (
            <div className="rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-1.5 text-xs">
              <span className="text-[#6B6D77]">Related Withdrawal: </span>
              <span className="text-white">
                ${(relatedWithdrawal.amountUsdCents / 100).toFixed(2)}
              </span>
              <span className="ml-1 text-[#6B6D77]">
                via {relatedWithdrawal.method} ({relatedWithdrawal.status})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                  msg.isAdmin
                    ? "bg-[#F5A623]/10 border border-[#F5A623]/20"
                    : "bg-[#1A1D27] border border-[#2A2D37]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      msg.isAdmin ? "text-[#F5A623]" : "text-[#8B8D97]"
                    }`}
                  >
                    {msg.isAdmin ? "Admin" : ticket.user.username}
                  </span>
                  <span className="text-[10px] text-[#4A4D57]">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-[#C8C9CE]">
                  {msg.content}
                </p>
                {msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 text-xs text-[#F5A623] hover:underline"
                  >
                    <Paperclip className="h-3 w-3" />
                    Attachment
                  </a>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="py-8 text-center text-sm text-[#4A4D57]">
            No messages yet
          </div>
        )}
      </div>

      {/* Reply box */}
      {!isClosed ? (
        <div className="border-t border-[#2A2D37] px-4 py-3">
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSendReply();
                }
              }}
              placeholder="Type your reply... (Ctrl+Enter to send)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2 text-sm text-white placeholder-[#4A4D57] outline-none focus:border-[#F5A623]/50"
            />
            <button
              onClick={handleSendReply}
              disabled={!reply.trim() || sending}
              className="flex items-center gap-1.5 self-end rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-medium text-black hover:bg-[#F5A623]/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-[#2A2D37] px-4 py-3 text-center text-xs text-[#4A4D57]">
          This ticket is closed. Reopen it to reply.
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function SupportPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const refreshList = useCallback(() => {
    setListRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left panel — ticket list */}
      <div
        className={`w-full border-r border-[#2A2D37] md:w-[380px] md:flex-shrink-0 ${
          selectedTicketId ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}
      >
        <TicketList
          onSelect={setSelectedTicketId}
          selectedId={selectedTicketId}
          refreshKey={listRefreshKey}
        />
      </div>

      {/* Right panel — detail */}
      <div
        className={`flex-1 ${
          selectedTicketId ? "flex flex-col" : "hidden md:flex md:flex-col"
        }`}
      >
        {selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
            onTicketUpdated={refreshList}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#4A4D57]">
            <Circle className="h-8 w-8" />
            <p className="text-sm">Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
