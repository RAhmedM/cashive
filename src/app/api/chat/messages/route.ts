/**
 * Chat Messages API
 *
 * GET  /api/chat/messages  — Load recent chat history (for initial page load)
 * POST /api/chat/messages  — Send a chat message (REST fallback, primary path is Socket.IO)
 *
 * Query params (GET):
 *   - room: chat room name (default "general")
 *   - cursor: message ID for cursor-based pagination (load older messages)
 *   - limit: number of messages (default 50, max 100)
 */
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  withAuth,
  jsonOk,
  jsonError,
  rateLimit,
  RATE_LIMITS,
  parseSearchParams,
} from "@/lib/middleware";
import { REDIS_CHANNELS } from "@/lib/socket-events";
import type { ChatMessagePayload } from "@/lib/socket-events";
import type { Prisma } from "@/generated/prisma";

// ---- GET: Load chat history ----

export const GET = withAuth(async (request, user) => {
  const params = parseSearchParams(request);
  const room = params.get("room") || "general";
  const cursor = params.get("cursor");
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));

  // Try Redis cache first (last 100 messages of the room)
  if (!cursor) {
    try {
      const cached = await redis.lrange(`chat:${room}:messages`, 0, limit - 1);
      if (cached.length > 0) {
        const messages = cached.map((m) => JSON.parse(m) as ChatMessagePayload);
        return jsonOk({
          messages,
          hasMore: cached.length === limit,
          source: "cache",
        });
      }
    } catch {
      // Redis unavailable — fall through to Postgres
    }
  }

  // Postgres fallback (or when paginating with cursor)
  const where: Prisma.ChatMessageWhereInput = {
    room,
    isDeleted: false,
  };

  if (cursor) {
    // Get the cursor message's createdAt for pagination
    const cursorMessage = await db.chatMessage.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorMessage) {
      where.createdAt = { lt: cursorMessage.createdAt };
    }
  }

  const messages = await db.chatMessage.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          vipTier: true,
          level: true,
          anonymousInChat: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // Fetch one extra to determine hasMore
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  // Reverse so messages are in chronological order (oldest first)
  messages.reverse();

  const formatted: ChatMessagePayload[] = messages.map((m) => ({
    id: m.id,
    userId: m.userId,
    username: m.user.anonymousInChat
      ? `${m.user.username.slice(0, 2)}***`
      : m.user.username,
    vipTier: m.user.vipTier,
    level: m.user.level,
    anonymousInChat: m.user.anonymousInChat,
    content: m.content,
    isSystemMessage: m.isSystemMessage,
    room: m.room,
    createdAt: m.createdAt.toISOString(),
  }));

  return jsonOk({ messages: formatted, hasMore });
});

// ---- POST: Send a chat message (REST fallback) ----

export const POST = withAuth(async (request, user) => {
  // Rate limit
  const rateLimited = await rateLimit(request, RATE_LIMITS.chat, user.id);
  if (rateLimited) return rateLimited;

  let body: { content?: string; room?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const content = body.content?.trim();
  const room = body.room || "general";

  if (!content || content.length === 0) {
    return jsonError("Message cannot be empty", 400);
  }
  if (content.length > 200) {
    return jsonError("Message cannot exceed 200 characters", 400);
  }

  // Check if user is muted
  if (user.chatMuted) {
    const muteExpiry = user.chatMutedUntil;
    if (!muteExpiry || new Date(muteExpiry) > new Date()) {
      return jsonError(
        muteExpiry
          ? `You are muted until ${new Date(muteExpiry).toISOString()}`
          : "You are muted",
        403
      );
    }
  }

  // Insert message
  const message = await db.chatMessage.create({
    data: {
      userId: user.id,
      room,
      content,
    },
  });

  const payload: ChatMessagePayload = {
    id: message.id,
    userId: user.id,
    username: user.anonymousInChat
      ? `${user.username.slice(0, 2)}***`
      : user.username,
    vipTier: user.vipTier,
    level: user.level,
    anonymousInChat: user.anonymousInChat,
    content,
    isSystemMessage: false,
    room,
    createdAt: message.createdAt.toISOString(),
  };

  // Publish to Redis for Socket.IO broadcast
  await redis
    .publish(REDIS_CHANNELS.CHAT_MESSAGE, JSON.stringify(payload))
    .catch(() => {});

  // Cache in Redis list
  await redis
    .lpush(`chat:${room}:messages`, JSON.stringify(payload))
    .catch(() => {});
  await redis.ltrim(`chat:${room}:messages`, 0, 99).catch(() => {});

  return jsonOk({ message: payload }, 201);
});

export const dynamic = "force-dynamic";
