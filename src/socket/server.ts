/**
 * Socket.IO server — standalone Node.js process (port 3001).
 *
 * Responsibilities:
 *   1. Authenticate WebSocket connections using the cashive_session cookie
 *   2. Subscribe to Redis Pub/Sub channels and broadcast to relevant clients
 *   3. Handle real-time chat (send, receive, rate-limit)
 *   4. Track online users per chat room
 *
 * Run via: npx tsx src/socket/server.ts
 * Or PM2:  pm2 start ecosystem.config.js --only cashive-socket
 *
 * Redis Pub/Sub flow:
 *   Next.js API (postback, admin actions) → redis.publish(channel, payload)
 *   This server subscribes → broadcasts to WebSocket clients
 */
import "dotenv/config";
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.SENTRY_DSN,
});
import { socketLogger } from "../lib/logger";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { Pool } from "pg";
import {
  REDIS_CHANNELS,
  SERVER_EVENTS,
  CLIENT_EVENTS,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type SocketData,
  type TickerEventPayload,
  type BalanceUpdatePayload,
  type NotificationPayload,
  type ChatMessagePayload,
  type ChatMessageDeletedPayload,
  type RaceUpdatePayload,
} from "../lib/socket-events";

// ---- Configuration ----

const PORT = parseInt(process.env.SOCKET_PORT ?? "3001", 10);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://user:password@localhost:5432/cashive";
const CORS_ORIGIN = process.env.APP_URL ?? "http://localhost:3000";

// Chat rate limit: 1 message per 3 seconds
const CHAT_RATE_LIMIT_MS = 3_000;
const CHAT_MAX_LENGTH = 200;
const CHAT_ROOM_DEFAULT = "general";

// ---- Database (direct pg for the socket server — no Prisma overhead) ----

const pool = new Pool({ connectionString: DATABASE_URL });

// ---- Redis clients ----
// We need separate clients: one for commands, one for pub/sub (blocking)

const redisCmd = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 200, 3000);
  },
});

const redisSub = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 200, 3000);
  },
});

// ---- HTTP + Socket.IO server ----

const httpServer = createServer((_req, res) => {
  // Health check endpoint
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "cashive-socket" }));
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

// ---- Authentication Middleware ----

/**
 * Validate the cashive_session cookie from the handshake.
 * Look up the session token in Redis first, then fall back to Postgres.
 */
io.use(async (socket, next) => {
  try {
    // Parse cookies from the handshake headers
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["cashive_session"];

    if (!token) {
      return next(new Error("Authentication required"));
    }

    // Try Redis session cache first
    const redisKey = `session:${token}`;
    const cached = await redisCmd.get(redisKey).catch(() => null);

    let userId: string | null = null;

    if (cached) {
      const parsed = JSON.parse(cached) as { userId: string };
      userId = parsed.userId;
    } else {
      // Fall back to Postgres
      const result = await pool.query(
        `SELECT user_id FROM session WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );
      if (result.rows.length === 0) {
        return next(new Error("Invalid or expired session"));
      }
      userId = result.rows[0].user_id;
    }

    if (!userId) {
      return next(new Error("Invalid session"));
    }

    // Fetch user data needed for chat and display
    const userResult = await pool.query(
      `SELECT id, username, vip_tier, level, anonymous_in_chat, is_banned, chat_muted, chat_muted_until
       FROM "user" WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return next(new Error("User not found"));
    }

    const user = userResult.rows[0];

    if (user.is_banned) {
      return next(new Error("Account is banned"));
    }

    // Check if mute has expired
    const isMuted =
      user.chat_muted &&
      (!user.chat_muted_until || new Date(user.chat_muted_until) > new Date());

    // Attach user data to the socket
    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.vipTier = user.vip_tier;
    socket.data.level = user.level;
    socket.data.anonymousInChat = user.anonymous_in_chat;
    socket.data.isMuted = isMuted;
    socket.data.muteExpiresAt = user.chat_muted_until
      ? new Date(user.chat_muted_until).toISOString()
      : null;

    next();
  } catch (err) {
    socketLogger.error({ err }, "Auth error");
    next(new Error("Authentication failed"));
  }
});

// ---- Track online users by room ----

// Map<room, Set<userId>>
const onlineUsers = new Map<string, Set<string>>();

function getOnlineCount(room: string): number {
  return onlineUsers.get(room)?.size ?? 0;
}

function addOnlineUser(room: string, userId: string): void {
  if (!onlineUsers.has(room)) {
    onlineUsers.set(room, new Set());
  }
  onlineUsers.get(room)!.add(userId);
}

function removeOnlineUser(room: string, userId: string): void {
  onlineUsers.get(room)?.delete(userId);
}

// ---- Chat rate limiter (in-memory, per userId) ----

const chatLastSent = new Map<string, number>();

function canSendChat(userId: string): boolean {
  const last = chatLastSent.get(userId) ?? 0;
  return Date.now() - last >= CHAT_RATE_LIMIT_MS;
}

function markChatSent(userId: string): void {
  chatLastSent.set(userId, Date.now());
}

// Clean up rate limit map periodically (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - CHAT_RATE_LIMIT_MS * 10;
  for (const [userId, timestamp] of chatLastSent) {
    if (timestamp < cutoff) chatLastSent.delete(userId);
  }
}, 300_000);

// ---- Connection Handler ----

io.on("connection", (socket) => {
  const { userId, username } = socket.data;
  socketLogger.info({ userId, username }, "Connected");

  // Join user-specific room for targeted events (balance, notifications)
  socket.join(`user:${userId}`);

  // Auto-join the default chat room
  const defaultRoom = `chat:${CHAT_ROOM_DEFAULT}`;
  socket.join(defaultRoom);
  addOnlineUser(CHAT_ROOM_DEFAULT, userId);

  // Broadcast updated online count
  io.to(defaultRoom).emit(
    SERVER_EVENTS.CHAT_ONLINE_COUNT,
    getOnlineCount(CHAT_ROOM_DEFAULT)
  );

  // ---- Chat: Send Message ----

  socket.on(CLIENT_EVENTS.CHAT_SEND, async (payload, callback) => {
    const room = payload.room ?? CHAT_ROOM_DEFAULT;
    const content = payload.content?.trim();

    // Validate
    if (!content || content.length === 0) {
      return callback({ ok: false, error: "Message cannot be empty" });
    }
    if (content.length > CHAT_MAX_LENGTH) {
      return callback({
        ok: false,
        error: `Message cannot exceed ${CHAT_MAX_LENGTH} characters`,
      });
    }

    // Check mute status (re-check from socket data)
    if (socket.data.isMuted) {
      const muteEnd = socket.data.muteExpiresAt;
      if (!muteEnd || new Date(muteEnd) > new Date()) {
        return callback({
          ok: false,
          error: muteEnd
            ? `You are muted until ${new Date(muteEnd).toLocaleString()}`
            : "You are muted",
        });
      }
      // Mute has expired — clear it
      socket.data.isMuted = false;
      socket.data.muteExpiresAt = null;
    }

    // Rate limit
    if (!canSendChat(userId)) {
      return callback({
        ok: false,
        error: "Please wait before sending another message",
      });
    }

    try {
      // Insert into PostgreSQL
      const result = await pool.query(
        `INSERT INTO chat_message (user_id, room, content)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [userId, room, content]
      );

      const row = result.rows[0];
      markChatSent(userId);

      const message: ChatMessagePayload = {
        id: row.id,
        userId,
        username: socket.data.anonymousInChat
          ? `${username.slice(0, 2)}***`
          : username,
        vipTier: socket.data.vipTier,
        level: socket.data.level,
        anonymousInChat: socket.data.anonymousInChat,
        content,
        isSystemMessage: false,
        room,
        createdAt: new Date(row.created_at).toISOString(),
      };

      // Broadcast to room
      io.to(`chat:${room}`).emit(SERVER_EVENTS.CHAT_MESSAGE, message);

      // Also cache in Redis list (last 100 messages)
      await redisCmd
        .lpush(`chat:${room}:messages`, JSON.stringify(message))
        .catch(() => {});
      await redisCmd.ltrim(`chat:${room}:messages`, 0, 99).catch(() => {});

      callback({ ok: true, message });
    } catch (err) {
      socketLogger.error({ err }, "Chat send error");
      callback({ ok: false, error: "Failed to send message" });
    }
  });

  // ---- Chat: Join Room ----

  socket.on(CLIENT_EVENTS.CHAT_JOIN, (room) => {
    // Leave previous rooms (except user-specific and default)
    for (const r of socket.rooms) {
      if (r.startsWith("chat:") && r !== defaultRoom) {
        socket.leave(r);
        removeOnlineUser(r.replace("chat:", ""), userId);
      }
    }
    socket.join(`chat:${room}`);
    addOnlineUser(room, userId);
    io.to(`chat:${room}`).emit(
      SERVER_EVENTS.CHAT_ONLINE_COUNT,
      getOnlineCount(room)
    );
  });

  // ---- Chat: Request Online Count ----

  socket.on(CLIENT_EVENTS.CHAT_ONLINE, (callback) => {
    callback(getOnlineCount(CHAT_ROOM_DEFAULT));
  });

  // ---- Disconnect ----

  socket.on("disconnect", () => {
    socketLogger.info({ userId, username }, "Disconnected");

    // Remove from all chat rooms
    for (const [room, users] of onlineUsers) {
      if (users.has(userId)) {
        users.delete(userId);
        io.to(`chat:${room}`).emit(
          SERVER_EVENTS.CHAT_ONLINE_COUNT,
          getOnlineCount(room)
        );
      }
    }
  });
});

// ---- Redis Pub/Sub Subscriber ----

redisSub.on("message", (channel, message) => {
  try {
    const payload = JSON.parse(message);

    // Ticker events → broadcast to everyone
    if (channel === REDIS_CHANNELS.TICKER_NEW) {
      io.emit(SERVER_EVENTS.TICKER_EVENT, payload as TickerEventPayload);
      return;
    }

    // Chat message (from admin system messages or other sources)
    if (channel === REDIS_CHANNELS.CHAT_MESSAGE) {
      const chatPayload = payload as ChatMessagePayload;
      io.to(`chat:${chatPayload.room}`).emit(
        SERVER_EVENTS.CHAT_MESSAGE,
        chatPayload
      );
      return;
    }

    // Chat message deleted (admin moderation)
    if (channel === REDIS_CHANNELS.CHAT_MESSAGE_DELETED) {
      const deletePayload = payload as ChatMessageDeletedPayload;
      io.to(`chat:${deletePayload.room}`).emit(
        SERVER_EVENTS.CHAT_MESSAGE_DELETED,
        deletePayload
      );
      return;
    }

    // Race leaderboard update → broadcast to everyone
    if (channel === REDIS_CHANNELS.RACE_UPDATE) {
      io.emit(SERVER_EVENTS.RACE_UPDATE, payload as RaceUpdatePayload);
      return;
    }

    // User-specific channels: user:{userId}:balance, user:{userId}:notification
    const userBalanceMatch = channel.match(/^user:(.+):balance$/);
    if (userBalanceMatch) {
      const targetUserId = userBalanceMatch[1];
      io.to(`user:${targetUserId}`).emit(
        SERVER_EVENTS.BALANCE_UPDATE,
        payload as BalanceUpdatePayload
      );
      return;
    }

    const userNotifMatch = channel.match(/^user:(.+):notification$/);
    if (userNotifMatch) {
      const targetUserId = userNotifMatch[1];
      io.to(`user:${targetUserId}`).emit(
        SERVER_EVENTS.NOTIFICATION,
        payload as NotificationPayload
      );
      return;
    }
  } catch (err) {
    socketLogger.error({ err }, "Error processing Redis message");
  }
});

// Subscribe to global channels
redisSub.subscribe(
  REDIS_CHANNELS.TICKER_NEW,
  REDIS_CHANNELS.CHAT_MESSAGE,
  REDIS_CHANNELS.CHAT_MESSAGE_DELETED,
  REDIS_CHANNELS.RACE_UPDATE,
  (err) => {
    if (err) {
      socketLogger.error({ err }, "Redis subscribe error");
    } else {
      socketLogger.info("Subscribed to global Redis channels");
    }
  }
);

// For user-specific channels, we use pattern subscribe
redisSub.psubscribe("user:*:balance", "user:*:notification", (err) => {
  if (err) {
    socketLogger.error({ err }, "Redis psubscribe error");
  } else {
    socketLogger.info("Subscribed to user-specific Redis patterns");
  }
});

// Handle pattern messages (psubscribe uses "pmessage" event)
redisSub.on("pmessage", (_pattern, channel, message) => {
  try {
    const payload = JSON.parse(message);

    const userBalanceMatch = channel.match(/^user:(.+):balance$/);
    if (userBalanceMatch) {
      const targetUserId = userBalanceMatch[1];
      io.to(`user:${targetUserId}`).emit(
        SERVER_EVENTS.BALANCE_UPDATE,
        payload as BalanceUpdatePayload
      );
      return;
    }

    const userNotifMatch = channel.match(/^user:(.+):notification$/);
    if (userNotifMatch) {
      const targetUserId = userNotifMatch[1];
      io.to(`user:${targetUserId}`).emit(
        SERVER_EVENTS.NOTIFICATION,
        payload as NotificationPayload
      );
      return;
    }
  } catch (err) {
    socketLogger.error({ err }, "Error processing Redis pmessage");
  }
});

// ---- Start Server ----

httpServer.listen(PORT, () => {
  socketLogger.info({ port: PORT, cors: CORS_ORIGIN, redis: REDIS_URL }, "cashive-socket listening");
});

// ---- Graceful Shutdown ----

async function shutdown() {
  socketLogger.info("Shutting down...");
  io.close();
  redisSub.disconnect();
  redisCmd.disconnect();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---- Helpers ----

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(";")) {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(valueParts.join("=").trim());
    }
  }
  return cookies;
}
