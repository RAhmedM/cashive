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
  ChevronDown,
  ChevronUp,
  Flag,
  Headset,
  MessageCircleQuestion,
  MessageSquare,
  PanelRightClose,
  SendHorizontal,
  Smile,
  Zap,
  X,
} from "lucide-react";
import { BeeIcon, HoneyIcon } from "./Icons";
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
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // ---- Load initial messages ----

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    api
      .get<{ messages: ChatMessagePayload[]; hasMore: boolean }>(
        "/api/chat/messages?room=general&limit=50"
      )
      .then((data) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(() => {
        // Silently fail — will show empty state
      })
      .finally(() => setLoading(false));
  }, [open]);

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

  // ---- FAQ data ----

  const faqs = [
    {
      question: "How do I withdraw?",
      answer:
        "Go to Cashout, choose a payment method, enter your details, and confirm the withdrawal.",
    },
    {
      question: "Why is my offer not credited?",
      answer:
        "Some offers take time to validate. Make sure tracking was enabled and the requirement was completed exactly.",
    },
    {
      question: "How long do withdrawals take?",
      answer:
        "Most crypto and PayPal methods process quickly, while gift cards can take up to 24 hours.",
    },
    {
      question: "How do I verify my account?",
      answer:
        "Open Settings > Security and start the identity verification flow before your first withdrawal.",
    },
  ];

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
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-xs text-text-secondary">
                Browse common questions or start a live chat with our team.
              </p>
              <div className="space-y-2">
                {faqs.map((faq, index) => {
                  const isOpen = expandedFaq === index;
                  return (
                    <div
                      key={faq.question}
                      className="rounded-xl border border-border bg-bg-elevated/60"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFaq(isOpen ? null : index)
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-medium text-text-primary">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>
                      {isOpen && (
                        <p className="px-4 pb-3 text-xs leading-5 text-text-secondary">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="mt-4 w-full rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest transition-all hover:bg-accent-gold-hover">
                Start Live Chat
              </button>
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-deepest px-3 py-2">
                <MessageCircleQuestion className="w-4 h-4 text-text-tertiary" />
                <input
                  placeholder="Describe your issue..."
                  className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                />
                <button className="rounded-full bg-accent-gold p-2 text-bg-deepest">
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
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
