/**
 * Shared Socket.IO event type definitions.
 *
 * Used by both the Socket.IO server and the client-side hook.
 * Defines every event name and its payload shape for type safety.
 *
 * Architecture:
 *   Next.js API routes → Redis Pub/Sub (publish)
 *   Socket.IO server   → Redis Pub/Sub (subscribe) → WebSocket broadcast
 */

// ---- Redis Pub/Sub Channels ----

export const REDIS_CHANNELS = {
  /** New ticker event (broadcast to all connected clients) */
  TICKER_NEW: "ticker:new",
  /** User-specific balance update: `user:{userId}:balance` */
  USER_BALANCE: (userId: string) => `user:${userId}:balance`,
  /** User-specific notification: `user:{userId}:notification` */
  USER_NOTIFICATION: (userId: string) => `user:${userId}:notification`,
  /** New chat message (broadcast to room) */
  CHAT_MESSAGE: "chat:message",
  /** Chat message deleted (broadcast to room) */
  CHAT_MESSAGE_DELETED: "chat:message:deleted",
  /** Race leaderboard update */
  RACE_UPDATE: "race:update",
} as const;

// Pattern for user-specific channels
export const USER_CHANNEL_PATTERN = "user:*";

// ---- Socket.IO Event Names (Server → Client) ----

export const SERVER_EVENTS = {
  /** A new ticker event (earning, withdrawal, race win) */
  TICKER_EVENT: "ticker:event",
  /** Balance updated for the authenticated user */
  BALANCE_UPDATE: "balance:update",
  /** New notification for the authenticated user */
  NOTIFICATION: "notification",
  /** New chat message in a room */
  CHAT_MESSAGE: "chat:message",
  /** A chat message was deleted */
  CHAT_MESSAGE_DELETED: "chat:message:deleted",
  /** Online user count changed */
  CHAT_ONLINE_COUNT: "chat:online_count",
  /** Race leaderboard position update */
  RACE_UPDATE: "race:update",
  /** User was muted in chat */
  CHAT_MUTED: "chat:muted",
} as const;

// ---- Socket.IO Event Names (Client → Server) ----

export const CLIENT_EVENTS = {
  /** Client sends a chat message */
  CHAT_SEND: "chat:send",
  /** Client joins a chat room */
  CHAT_JOIN: "chat:join",
  /** Client requests current online count */
  CHAT_ONLINE: "chat:online",
} as const;

// ---- Event Payload Types ----

export interface TickerEventPayload {
  type: "earning" | "withdrawal" | "race_win";
  username: string;
  amount: number;
  offerName?: string;
  provider?: string;
  timestamp: number;
}

export interface BalanceUpdatePayload {
  userId: string;
  balanceHoney: number;
  earned: number;
  offerName: string;
  provider: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
}

export interface ChatMessagePayload {
  id: string;
  userId: string;
  username: string;
  vipTier: string;
  level: number;
  anonymousInChat: boolean;
  content: string;
  isSystemMessage: boolean;
  room: string;
  createdAt: string;
}

export interface ChatMessageDeletedPayload {
  messageId: string;
  room: string;
}

export interface ChatSendPayload {
  content: string;
  room?: string;
}

export interface RaceUpdatePayload {
  raceId: string;
  userId: string;
  username: string;
  points: number;
  rank: number;
}

// ---- Server-to-Client Event Map (for typed Socket.IO) ----

export interface ServerToClientEvents {
  [SERVER_EVENTS.TICKER_EVENT]: (payload: TickerEventPayload) => void;
  [SERVER_EVENTS.BALANCE_UPDATE]: (payload: BalanceUpdatePayload) => void;
  [SERVER_EVENTS.NOTIFICATION]: (payload: NotificationPayload) => void;
  [SERVER_EVENTS.CHAT_MESSAGE]: (payload: ChatMessagePayload) => void;
  [SERVER_EVENTS.CHAT_MESSAGE_DELETED]: (payload: ChatMessageDeletedPayload) => void;
  [SERVER_EVENTS.CHAT_ONLINE_COUNT]: (count: number) => void;
  [SERVER_EVENTS.RACE_UPDATE]: (payload: RaceUpdatePayload) => void;
  [SERVER_EVENTS.CHAT_MUTED]: (payload: { until: string; reason: string }) => void;
}

// ---- Client-to-Server Event Map ----

export interface ClientToServerEvents {
  [CLIENT_EVENTS.CHAT_SEND]: (
    payload: ChatSendPayload,
    callback: (response: { ok: boolean; error?: string; message?: ChatMessagePayload }) => void
  ) => void;
  [CLIENT_EVENTS.CHAT_JOIN]: (room: string) => void;
  [CLIENT_EVENTS.CHAT_ONLINE]: (
    callback: (count: number) => void
  ) => void;
}

// ---- Socket Data (attached to each socket) ----

export interface SocketData {
  userId: string;
  username: string;
  vipTier: string;
  level: number;
  anonymousInChat: boolean;
  isMuted: boolean;
  muteExpiresAt: string | null;
}
