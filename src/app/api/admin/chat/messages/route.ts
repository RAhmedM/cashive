/**
 * Admin Chat Messages API
 *
 * GET  - List/search chat messages with filters
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseSearchParams } from "@/lib/middleware";
import type { Prisma } from "@/generated/prisma";

export const GET = withAdmin(async (request, admin) => {
  const params = parseSearchParams(request);
  const search = params.get("search")?.trim() || "";
  const room = params.get("room") || "";
  const userId = params.get("userId") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const where: Prisma.ChatMessageWhereInput = {};

  if (search) {
    where.content = { contains: search, mode: "insensitive" };
  }
  if (room) {
    where.room = room;
  }
  if (userId) {
    where.userId = userId;
  }

  const [messages, total] = await Promise.all([
    db.chatMessage.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, chatMuted: true, chatMutedUntil: true } },
        reports: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    db.chatMessage.count({ where }),
  ]);

  return jsonOk({ messages, total, page, limit });
}, "MODERATOR");

export const dynamic = "force-dynamic";
