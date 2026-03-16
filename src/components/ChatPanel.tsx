"use client";

/**
 * ChatPanel — Real-time community chat ("Hive Chat") panel.
 *
 * Loads initial history from /api/chat/messages, then receives
 * live updates via Socket.IO. Messages are sent through Socket.IO
 * with REST fallback.
 *
 * Features:
 *   - Live message streaming
 *   - Online user count
 *   - Rate limiting (3s between messages, client-side enforced)
 *   - Report messages
 *   - Scroll-to-bottom on new messages
 *   - Load older messages (cursor pagination)
 *   - Support tab (FAQ + placeholder for live support)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  Headset,
  Inbox,
  MessageCircleQuestion,
  MessageSquare,
  PanelRightClose,
  SendHorizontal,
  Smile,
  Zap,
  X,
} from "lucide-react";
import { BeeIcon } from "./Icons";
import { HexBadge, ProviderAvatar } from "./SharedComponents";
import BeeLoader from "./BeeLoader";
import { useSocket, useSocketEvent } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { SERVER_EVENTS, CLIENT_EVENTS } from "@/lib/socket-events";
import type { ChatMessagePayload, ChatMessageDeletedPayload } from "@/lib/socket-events";

// ---- VIP tier color map ----

const tierColors: Record<string, string> = {
  NONE: "#F0ECE4",
  BRONZE: "#CD7F32",
  SILVER: "#A8B2BD",
  GOLD: "#F5A623",
  PLATINUM: "#B8D4E3",
};

// ---- Chat Message Component ----

function ChatMsg({
  msg,
  isCurrentUser,
  onReport,
}: {
  msg: ChatMessagePayload;
  isCurrentUser: boolean;
  onReport: (messageId: string) => void;
}) {
  if (msg.isSystemMessage) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-2 text-center text-[11px] italic text-text-tertiary">
        <Zap className="w-3.5 h-3.5 text-accent-gold/80" />
        <span>{msg.content}</span>
      </div>
    );
  }

  const color = tierColors[msg.vipTier] ?? "#F0ECE4";
  const tierLabel = msg.vipTier !== "NONE" ? msg.vipTier[0] : null;
  const timeStr = formatTime(msg.createdAt);

  return (
    <div
      className={`group rounded-xl p-2.5 transition-colors ${
        isCurrentUser ? "bg-bg-elevated/70" : "hover:bg-bg-elevated/40"
      }`}
    >
      <div className="flex gap-2.5">
        <ProviderAvatar
          name={msg.username}
          size={24}
          className="rounded-full text-[9px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold" style={{ color }}>
              {msg.username}
            </span>
            {tierLabel && <HexBadge text={tierLabel} size="sm" />}
            {msg.level > 0 && (
              <span className="text-[10px] text-text-tertiary">
                Lv.{msg.level}
              </span>
            )}
            {isCurrentUser && (
              <span className="text-[10px] text-accent-gold">You</span>
            )}
            <span className="text-[10px] text-text-tertiary">{timeStr}</span>
            {!isCurrentUser && (
              <button
                onClick={() => onReport(msg.id)}
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-text-tertiary hover:text-danger"
                title="Report message"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-text-primary">
            {msg.content}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Chat Input Component ----

function ChatInput({
  onSend,
  disabled,
  sending,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  sending: boolean;
}) {
  const [value, setValue] = useState("");
  const [warning, setWarning] = useState("");
  const lastSentRef = useRef(0);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;

    const now = Date.now();
    if (now - lastSentRef.current < 3000) {
      setWarning("Slow down! You can send a message every 3 seconds.");
      return;
    }

    lastSentRef.current = now;
    setWarning("");
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-deepest p-2">
        <button
          className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
          type="button"
        >
          <Smile className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            rows={1}
            placeholder={
              disabled
                ? "You are currently muted."
                : "Say something to the hive..."
            }
            className="max-h-28 w-full resize-none bg-transparent px-1 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
          />
          {value.length >= 150 && (
            <div className="px-1 text-right text-[10px] text-text-tertiary">
              {value.length}/200
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled || sending}
          className="rounded-full bg-gradient-to-br from-accent-gold to-accent-orange p-2.5 text-bg-deepest shadow-[0_4px_16px_rgba(245,166,35,0.3)] transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>
      {warning && (
        <p className="mt-2 text-[11px] text-accent-gold">{warning}</p>
      )}
    </div>
  );
}

// ---- Main ChatPanel ----

export default function ChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { socket, connected, onlineCount } = useSocket();

  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "support">("chat");
  const [reportingId, setReportingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // ---- Load initial messages ----

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<{
        messages: ChatMessagePayload[];
        hasMore: boolean;
      }>("/api/chat/messages?room=general&limit=50");
      setMessages(data.messages);
      setHasMore(data.hasMore);
      return data;
    } catch {
      // Silently fail
      return null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
  }, [open, fetchMessages]);

  // ---- Poll for new messages when socket is not connected ----

  useEffect(() => {
    if (connected || !open) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.get<{
          messages: ChatMessagePayload[];
          hasMore: boolean;
        }>("/api/chat/messages?room=general&limit=50");
        setMessages((prev) => {
          // Merge: keep any messages from prev not in new data, append new ones
          const existingIds = new Set(prev.map((m) => m.id));
          const newIds = new Set(data.messages.map((m) => m.id));
          // Keep old messages not in the new batch (e.g. loaded-more messages)
          const kept = prev.filter((m) => !newIds.has(m.id));
          // Combine and sort chronologically
          const merged = [...kept, ...data.messages].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          // Only update if something changed
          if (
            merged.length === prev.length &&
            merged.every((m, i) => m.id === prev[i]?.id)
          ) {
            return prev;
          }
          return merged;
        });
        setHasMore(data.hasMore);
      } catch {
        // Silently fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connected, open]);

  // ---- Auto-scroll to bottom on new messages ----

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Track if user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // ---- Socket.IO: receive new messages ----

  useSocketEvent(SERVER_EVENTS.CHAT_MESSAGE, (payload: ChatMessagePayload) => {
    if (payload.room === "general") {
      setMessages((prev) => {
        // Deduplicate (in case REST fallback also received it)
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
    }
  });

  // ---- Socket.IO: message deleted ----

  useSocketEvent(
    SERVER_EVENTS.CHAT_MESSAGE_DELETED,
    (payload: ChatMessageDeletedPayload) => {
      setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
    }
  );

  // ---- Send message via Socket.IO (with REST fallback) ----

  const handleSend = useCallback(
    async (text: string) => {
      if (!user) return;
      setSending(true);

      try {
        if (socket?.connected) {
          // Primary: send via Socket.IO
          socket.emit(
            CLIENT_EVENTS.CHAT_SEND as any,
            { content: text, room: "general" },
            (response: { ok: boolean; error?: string; message?: ChatMessagePayload }) => {
              if (!response.ok) {
                console.warn("[Chat] Send failed:", response.error);
              }
              // Message will arrive via the CHAT_MESSAGE event
              setSending(false);
            }
          );
        } else {
          // Fallback: send via REST API
          const data = await api.post<{ message: ChatMessagePayload }>(
            "/api/chat/messages",
            { content: text, room: "general" }
          );
          // Add message locally (in case socket event is slow)
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setSending(false);
        }
      } catch (err) {
        console.error("[Chat] Send error:", err);
        setSending(false);
      }
    },
    [socket, user]
  );

  // ---- Load older messages ----

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldestId = messages[0]?.id;
    try {
      const data = await api.get<{
        messages: ChatMessagePayload[];
        hasMore: boolean;
      }>(`/api/chat/messages?room=general&cursor=${oldestId}&limit=50`);
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, messages]);

  // ---- Report message ----

  const handleReport = useCallback(
    async (messageId: string) => {
      if (reportingId) return; // Already reporting
      setReportingId(messageId);

      try {
        await api.post(`/api/chat/messages/${messageId}/report`, {
          reason: "INAPPROPRIATE",
        });
        // Could show a toast here
      } catch {
        // Silently fail
      } finally {
        setReportingId(null);
      }
    },
    [reportingId]
  );

  // ---- Render ----

  const isMuted = user?.chatMuted
    ? !user.chatMutedUntil || new Date(user.chatMutedUntil) > new Date()
    : false;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 xl:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed right-0 top-16 bottom-0 z-40 flex w-full max-w-[100vw] flex-col overflow-hidden border-l border-border bg-bg-surface transition-transform duration-300 ease-out max-md:top-auto max-md:h-[82vh] max-md:rounded-t-3xl max-md:border-l-0 max-md:border-t md:w-[380px] xl:w-[320px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <BeeIcon className="w-6 h-6" />
              <h3 className="font-heading text-base font-bold text-text-primary">
                {activeTab === "chat" ? "Hive Chat" : "Support"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === "chat"
                  ? "border-b-2 border-accent-gold text-accent-gold"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
              <span className="ml-1 flex items-center gap-1 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {connected ? onlineCount : "--"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("support")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === "support"
                  ? "border-b-2 border-accent-gold text-accent-gold"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <Headset className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>
          </div>
        </div>

        {/* Chat tab */}
        {activeTab === "chat" ? (
          <>
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-3"
            >
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <BeeLoader size="sm" label="Loading chat..." />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-text-tertiary">
                  <MessageSquare className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No messages yet. Say hi!</p>
                </div>
              ) : (
                <>
                  {/* Load more button */}
                  {hasMore && (
                    <div className="mb-2 flex justify-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="rounded-full bg-bg-elevated px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-bg-elevated/80 disabled:opacity-50"
                      >
                        {loadingMore ? "Loading..." : "Load older messages"}
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-1">
                    {messages.map((msg) => (
                      <ChatMsg
                        key={msg.id}
                        msg={msg}
                        isCurrentUser={msg.userId === user?.id}
                        onReport={handleReport}
                      />
                    ))}
                  </div>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Jump to latest */}
            {!isAtBottomRef.current && messages.length > 0 && (
              <div className="px-3 pb-2">
                <button
                  onClick={() =>
                    messagesEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  className="mx-auto block rounded-full bg-accent-gold/10 px-3 py-1 text-[11px] font-medium text-accent-gold hover:bg-accent-gold/15"
                >
                  Jump to latest
                </button>
              </div>
            )}

            {/* Chat input */}
            {user ? (
              <ChatInput
                onSend={handleSend}
                disabled={isMuted}
                sending={sending}
              />
            ) : (
              <div className="border-t border-border p-3 text-center text-xs text-text-tertiary">
                Log in to join the chat
              </div>
            )}
          </>
        ) : (
          /* Support tab */
          <SupportTab />
        )}
      </aside>
    </>
  );
}

// ---- Support Tab Component ----

interface TicketSummary {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  isAdmin: boolean;
  content: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const TICKET_CATEGORIES = [
  { value: "WITHDRAWAL", label: "Withdrawal Issue" },
  { value: "OFFER_NOT_CREDITED", label: "Missing Credit" },
  { value: "ACCOUNT", label: "Account Issue" },
  { value: "KYC", label: "KYC / Verification" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = {
  WITHDRAWAL: "Withdrawal",
  OFFER_NOT_CREDITED: "Missing Credit",
  ACCOUNT: "Account",
  KYC: "KYC",
  OTHER: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "text-accent-gold bg-accent-gold/10" },
  IN_PROGRESS: { label: "In Progress", color: "text-info bg-info/10" },
  WAITING_USER: { label: "Awaiting Reply", color: "text-warning bg-warning/10" },
  RESOLVED: { label: "Resolved", color: "text-success bg-success/10" },
  CLOSED: { label: "Closed", color: "text-text-tertiary bg-bg-elevated" },
};

function SupportTab() {
  const [view, setView] = useState<"faq" | "form" | "success" | "tickets" | "ticket-detail">("faq");
  const [expanded, setExpanded] = useState<number | null>(0);
  // Form state
  const [category, setCategory] = useState("OTHER");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState("");
  const [descInput, setDescInput] = useState("");
  // Tickets list state
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  // Ticket detail state
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const faqs = [
    { question: "How do I withdraw?", answer: "Go to Cashout, choose a payment method, enter your details, and confirm the withdrawal." },
    { question: "Why is my offer not credited?", answer: "Some offers take time to validate. Make sure tracking was enabled and the requirement was completed exactly." },
    { question: "How long do withdrawals take?", answer: "Most crypto and PayPal methods process quickly, while gift cards can take up to 24 hours." },
    { question: "How do I verify my account?", answer: "Open Settings > Security and start the identity verification flow before your first withdrawal." },
  ];

  const resetForm = () => {
    setCategory("OTHER");
    setSubject("");
    setMessage("");
    setError("");
    setDescInput("");
  };

  const openCreateForm = (prefill?: string) => {
    resetForm();
    if (prefill) setMessage(prefill);
    setView("form");
  };

  // ---- Fetch tickets ----

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const data = await api.get<{ tickets: TicketSummary[] }>("/api/user/me/support?limit=50");
      setTickets(data.tickets);
    } catch {
      // Silently fail
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const openTicketsList = () => {
    setView("tickets");
    fetchTickets();
  };

  // ---- Fetch single ticket ----

  const openTicketDetail = async (ticketId: string) => {
    setTicketLoading(true);
    setView("ticket-detail");
    try {
      const data = await api.get<{ ticket: TicketDetail }>(`/api/user/me/support/${ticketId}`);
      setActiveTicket(data.ticket);
    } catch {
      setActiveTicket(null);
    } finally {
      setTicketLoading(false);
    }
  };

  // Scroll to bottom when ticket messages load or change
  useEffect(() => {
    if (view === "ticket-detail" && activeTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [view, activeTicket?.messages?.length]);

  // ---- Submit new ticket ----

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Please fill in both subject and message.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ ticket: { id: string } }>("/api/user/me/support", {
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setCreatedTicketId(res.ticket.id);
      setView("success");
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- Reply to ticket ----

  const handleReply = async () => {
    if (!activeTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      await api.post(`/api/user/me/support/${activeTicket.id}/messages`, {
        message: replyText.trim(),
      });
      setReplyText("");
      // Refresh the ticket detail to show the new message
      const data = await api.get<{ ticket: TicketDetail }>(
        `/api/user/me/support/${activeTicket.id}`
      );
      setActiveTicket(data.ticket);
    } catch {
      // Silently fail
    } finally {
      setReplying(false);
    }
  };

  const handleDescSubmit = () => {
    const t = descInput.trim();
    if (!t) return;
    openCreateForm(t);
    setDescInput("");
  };

  // ---- Ticket Detail View ----

  if (view === "ticket-detail") {
    const isClosed = activeTicket?.status === "CLOSED";
    const statusInfo = activeTicket ? STATUS_CONFIG[activeTicket.status] ?? STATUS_CONFIG.OPEN : STATUS_CONFIG.OPEN;

    return (
      <>
        <div className="flex-1 overflow-y-auto">
          {/* Ticket header */}
          <div className="border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={openTicketsList}
              className="mb-2 flex items-center gap-1 text-xs text-text-tertiary hover:text-accent-gold transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to tickets
            </button>
            {ticketLoading ? (
              <div className="flex justify-center py-4">
                <BeeLoader size="sm" />
              </div>
            ) : activeTicket ? (
              <>
                <h4 className="text-sm font-semibold text-text-primary leading-snug">
                  {activeTicket.subject}
                </h4>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {CATEGORY_LABELS[activeTicket.category] ?? activeTicket.category}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {formatTime(activeTicket.createdAt)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-text-tertiary">Ticket not found.</p>
            )}
          </div>

          {/* Messages thread */}
          {activeTicket && (
            <div className="px-4 py-3 space-y-3">
              {activeTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 ${
                    msg.isAdmin
                      ? "bg-accent-gold/5 border border-accent-gold/15 ml-2"
                      : "bg-bg-elevated/60 border border-border mr-2"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold ${
                        msg.isAdmin ? "text-accent-gold" : "text-text-secondary"
                      }`}
                    >
                      {msg.isAdmin ? "Support Team" : "You"}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-text-primary whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Reply input */}
        {activeTicket && !isClosed && (
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-deepest p-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 5000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                placeholder="Type your reply..."
                rows={2}
                className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <button
                type="button"
                onClick={handleReply}
                disabled={!replyText.trim() || replying}
                className="rounded-full bg-accent-gold p-2 text-bg-deepest disabled:opacity-50"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTicket && isClosed && (
          <div className="border-t border-border p-3 text-center text-xs text-text-tertiary">
            This ticket is closed.
          </div>
        )}
      </>
    );
  }

  // ---- Tickets List View ----

  if (view === "tickets") {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-4">
          <button
            type="button"
            onClick={() => setView("faq")}
            className="mb-3 flex items-center gap-1 text-xs text-text-tertiary hover:text-accent-gold transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-primary">My Tickets</h4>
            <button
              type="button"
              onClick={() => openCreateForm()}
              className="rounded-lg bg-accent-gold px-3 py-1.5 text-xs font-semibold text-bg-deepest"
            >
              New Ticket
            </button>
          </div>

          {ticketsLoading ? (
            <div className="flex justify-center py-8">
              <BeeLoader size="sm" label="Loading tickets..." />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-text-tertiary">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-xs">No tickets yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => {
                const statusInfo = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;
                const hasAdminReply = ticket.status === "WAITING_USER" || ticket.status === "IN_PROGRESS";
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => openTicketDetail(ticket.id)}
                    className="w-full rounded-xl border border-border bg-bg-elevated/60 p-3 text-left transition-colors hover:border-accent-gold/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">
                        {ticket.subject}
                      </p>
                      {hasAdminReply && (
                        <span className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-accent-gold" />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      </span>
                      <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" />
                        {ticket._count.messages}
                      </span>
                      <span className="ml-auto text-[10px] text-text-tertiary">
                        {formatTime(ticket.updatedAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // ---- Create Ticket Form ----

  if (view === "form") {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-4">
          <button
            type="button"
            onClick={() => setView("faq")}
            className="mb-3 flex items-center gap-1 text-xs text-text-tertiary hover:text-accent-gold transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to FAQ
          </button>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-text-primary">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-deepest px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent-gold"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-text-primary">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary"
                maxLength={200}
                className="w-full rounded-xl border border-border bg-bg-deepest px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-text-primary">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue..."
                rows={4}
                maxLength={5000}
                className="w-full resize-none rounded-xl border border-border bg-bg-deepest px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-gold"
              />
            </label>
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !subject.trim() || !message.trim()}
            className="mt-4 w-full rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest transition-all hover:bg-accent-gold-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
        </div>
      </>
    );
  }

  // ---- Success View ----

  if (view === "success") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <Check className="w-7 h-7 text-success" />
        </div>
        <h4 className="mb-1 font-heading text-base font-bold text-text-primary">Ticket Created</h4>
        <p className="mb-1 text-xs text-text-secondary">Your support ticket has been submitted.</p>
        <p className="mb-5 font-mono text-xs text-text-tertiary">
          ID: {createdTicketId.slice(0, 8)}...
        </p>
        <div className="w-full space-y-2">
          <button
            type="button"
            onClick={() => openTicketDetail(createdTicketId)}
            className="block w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-text-secondary hover:border-accent-gold/30 hover:text-text-primary"
          >
            View Ticket
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setView("faq");
            }}
            className="w-full rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest hover:bg-accent-gold-hover"
          >
            Back to FAQ
          </button>
        </div>
      </div>
    );
  }

  // ---- FAQ View (default) ----

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs text-text-secondary">
          Browse common questions or create a support ticket.
        </p>
        <div className="space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = expanded === index;
            return (
              <div key={faq.question} className="rounded-xl border border-border bg-bg-elevated/60">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-text-primary">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-text-secondary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  )}
                </button>
                {isOpen && (
                  <p className="px-4 pb-3 text-xs leading-5 text-text-secondary">{faq.answer}</p>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => openCreateForm()}
          className="mt-4 w-full rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest transition-all hover:bg-accent-gold-hover"
        >
          Create Ticket
        </button>
        <button
          type="button"
          onClick={openTicketsList}
          className="mt-2 w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:border-accent-gold/30 hover:text-text-primary"
        >
          My Tickets
        </button>
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-deepest px-3 py-2">
          <MessageCircleQuestion className="w-4 h-4 text-text-tertiary" />
          <input
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleDescSubmit();
              }
            }}
            placeholder="Describe your issue..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <button
            type="button"
            onClick={handleDescSubmit}
            disabled={!descInput.trim()}
            className="rounded-full bg-accent-gold p-2 text-bg-deepest disabled:opacity-50"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ---- Helpers ----

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
