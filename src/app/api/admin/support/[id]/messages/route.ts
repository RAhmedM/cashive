/**
 * Admin Support Ticket Messages API
 *
 * GET  - List messages for a ticket
 * POST - Add an admin reply to a ticket
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const replySchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000),
  attachmentUrl: z.string().url().optional(),
});

export const GET = withAdmin(async (_request, _admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing ticket ID", 400);

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ticket) return jsonError("Ticket not found", 404);

  const messages = await db.supportMessage.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
  });

  return jsonOk({ messages });
}, "SUPPORT_AGENT");

export const POST = withAdmin(async (request, admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing ticket ID", 400);

  const { data, error } = await parseBody(request, replySchema);
  if (error) return error;

  const ticket = await db.supportTicket.findUnique({
    where: { id },
  });
  if (!ticket) return jsonError("Ticket not found", 404);
  if (ticket.status === "CLOSED") return jsonError("Ticket is closed", 400);

  // Create admin reply
  const message = await db.supportMessage.create({
    data: {
      ticketId: id,
      senderId: admin.id,
      isAdmin: true,
      content: data.content,
      attachmentUrl: data.attachmentUrl ?? null,
    },
  });

  // Auto-update ticket status to IN_PROGRESS if it was OPEN, or WAITING_USER
  const statusUpdates: Record<string, unknown> = { updatedAt: new Date() };
  if (ticket.status === "OPEN") {
    statusUpdates.status = "IN_PROGRESS";
  }
  // If unassigned, auto-assign to the replying admin
  if (!ticket.assignedTo) {
    statusUpdates.assignedTo = admin.id;
  }

  if (Object.keys(statusUpdates).length > 1) {
    await db.supportTicket.update({
      where: { id },
      data: statusUpdates,
    });
  }

  createAuditLog({
    adminId: admin.id,
    action: "support.ticket.reply",
    targetType: "SupportTicket",
    targetId: id,
    afterState: {
      messageId: message.id,
      contentLength: data.content.length,
    } as unknown as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ message }, 201);
}, "SUPPORT_AGENT");

export const dynamic = "force-dynamic";
