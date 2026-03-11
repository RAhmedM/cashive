/**
 * Admin Support Ticket Detail API
 *
 * GET  - Get ticket detail with user info, messages, related entities
 * PATCH - Update ticket (status, priority, assign, resolve)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().nullable().optional(),
});

export const GET = withAdmin(async (_request, _admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing ticket ID", 400);

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          vipTier: true,
          isBanned: true,
        },
      },
      assignee: { select: { id: true, name: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return jsonError("Ticket not found", 404);

  // Fetch related entities if linked
  let relatedOffer = null;
  let relatedWithdrawal = null;

  if (ticket.relatedOfferId) {
    relatedOffer = await db.offerCompletion.findUnique({
      where: { id: ticket.relatedOfferId },
      select: {
        id: true,
        offerName: true,
        rewardToUserHoney: true,
        status: true,
        createdAt: true,
        provider: { select: { name: true } },
      },
    });
  }

  if (ticket.relatedWithdrawalId) {
    relatedWithdrawal = await db.withdrawal.findUnique({
      where: { id: ticket.relatedWithdrawalId },
      select: {
        id: true,
        amountHoney: true,
        amountUsdCents: true,
        method: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // Fetch available admins for assignment dropdown
  const admins = await db.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return jsonOk({ ticket, relatedOffer, relatedWithdrawal, admins });
}, "SUPPORT_AGENT");

export const PATCH = withAdmin(async (request, admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing ticket ID", 400);

  const { data, error } = await parseBody(request, updateTicketSchema);
  if (error) return error;

  const ticket = await db.supportTicket.findUnique({ where: { id } });
  if (!ticket) return jsonError("Ticket not found", 404);

  const beforeState: Record<string, string | boolean | null> = {};
  const afterState: Record<string, string | boolean | null> = {};
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.status !== undefined && data.status !== ticket.status) {
    beforeState.status = ticket.status;
    afterState.status = data.status;
    updateData.status = data.status;

    // Set resolvedAt when resolving/closing
    if ((data.status === "RESOLVED" || data.status === "CLOSED") && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
      afterState.resolvedAt = true;
    }
    // Clear resolvedAt if reopening
    if (data.status === "OPEN" || data.status === "IN_PROGRESS") {
      updateData.resolvedAt = null;
    }
  }

  if (data.priority !== undefined && data.priority !== ticket.priority) {
    beforeState.priority = ticket.priority;
    afterState.priority = data.priority;
    updateData.priority = data.priority;
  }

  if (data.assignedTo !== undefined && data.assignedTo !== ticket.assignedTo) {
    beforeState.assignedTo = ticket.assignedTo;
    afterState.assignedTo = data.assignedTo;
    updateData.assignedTo = data.assignedTo;
  }

  if (Object.keys(beforeState).length === 0) {
    return jsonError("No changes provided", 400);
  }

  const updated = await db.supportTicket.update({
    where: { id },
    data: updateData,
    include: {
      user: { select: { id: true, username: true, email: true } },
      assignee: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
  });

  createAuditLog({
    adminId: admin.id,
    action: "support.ticket.update",
    targetType: "SupportTicket",
    targetId: id,
    beforeState: beforeState as Prisma.InputJsonValue,
    afterState: afterState as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ ticket: updated });
}, "SUPPORT_AGENT");

export const dynamic = "force-dynamic";
