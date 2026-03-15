/**
 * Admin Chat Message Actions API
 *
 * DELETE - Soft-delete a chat message (sets isDeleted = true, records deletedBy)
 */
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { withAdmin, jsonOk, jsonError } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { REDIS_CHANNELS } from "@/lib/socket-events";

export const DELETE = withAdmin(async (request, admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing message ID", 400);

  const message = await db.chatMessage.findUnique({
    where: { id },
    select: { id: true, content: true, userId: true, isDeleted: true, room: true },
  });

  if (!message) return jsonError("Message not found", 404);
  if (message.isDeleted) return jsonError("Message already deleted", 400);

  await db.chatMessage.update({
    where: { id },
    data: { isDeleted: true, deletedBy: admin.id },
  });

  createAuditLog({
    adminId: admin.id,
    action: "chat.message.delete",
    targetType: "ChatMessage",
    targetId: id,
    beforeState: { content: message.content, userId: message.userId, room: message.room },
    afterState: { isDeleted: true, deletedBy: admin.id },
  }).catch(() => {});

  // Publish deletion to Socket.IO for real-time removal from all clients
  await redis
    .publish(
      REDIS_CHANNELS.CHAT_MESSAGE_DELETED,
      JSON.stringify({ messageId: id, room: message.room })
    )
    .catch(() => {});

  return jsonOk({ success: true });
}, "MODERATOR");

export const dynamic = "force-dynamic";
