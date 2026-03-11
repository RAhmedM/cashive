/**
 * Admin Muted Users API
 *
 * GET   - List currently muted users
 * PATCH - Mute or unmute a user
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody, parseSearchParams } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

export const GET = withAdmin(async (request, admin) => {
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const now = new Date();
  const where: Prisma.UserWhereInput = {
    chatMuted: true,
    OR: [
      { chatMutedUntil: null },
      { chatMutedUntil: { gt: now } },
    ],
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        chatMuted: true,
        chatMutedUntil: true,
      },
      orderBy: { chatMutedUntil: { sort: "desc", nulls: "first" } },
      skip: offset,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return jsonOk({ users, total, page, limit });
}, "MODERATOR");

const muteUserSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["mute", "unmute"]),
  durationMinutes: z.number().int().positive().optional(),
});

export const PATCH = withAdmin(async (request, admin) => {
  const { data, error } = await parseBody(request, muteUserSchema);
  if (error) return error;

  const user = await db.user.findUnique({
    where: { id: data.userId },
    select: { id: true, username: true, chatMuted: true, chatMutedUntil: true },
  });

  if (!user) return jsonError("User not found", 404);

  const beforeState = { chatMuted: user.chatMuted, chatMutedUntil: user.chatMutedUntil };

  if (data.action === "unmute") {
    await db.user.update({
      where: { id: data.userId },
      data: { chatMuted: false, chatMutedUntil: null },
    });
  } else {
    const mutedUntil = data.durationMinutes
      ? new Date(Date.now() + data.durationMinutes * 60 * 1000)
      : null;
    await db.user.update({
      where: { id: data.userId },
      data: { chatMuted: true, chatMutedUntil: mutedUntil },
    });
  }

  const updatedUser = await db.user.findUnique({
    where: { id: data.userId },
    select: { chatMuted: true, chatMutedUntil: true },
  });

  createAuditLog({
    adminId: admin.id,
    action: `chat.user.${data.action}`,
    targetType: "User",
    targetId: data.userId,
    beforeState: beforeState as Prisma.InputJsonValue,
    afterState: updatedUser as unknown as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ success: true });
}, "MODERATOR");

export const dynamic = "force-dynamic";
