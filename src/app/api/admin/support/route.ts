/**
 * Admin Support Tickets API
 *
 * GET - List tickets with filters (status, priority, category, assignedTo)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, parseSearchParams } from "@/lib/middleware";
import type { Prisma } from "@/generated/prisma";

export const GET = withAdmin(async (request, admin) => {
  const params = parseSearchParams(request);
  const status = params.get("status") || "";
  const priority = params.get("priority") || "";
  const category = params.get("category") || "";
  const assignedTo = params.get("assignedTo") || "";
  const mine = params.get("mine") === "true";
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const where: Prisma.SupportTicketWhereInput = {};

  if (status && ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"].includes(status)) {
    where.status = status as Prisma.EnumTicketStatusFilter;
  }
  if (priority && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) {
    where.priority = priority as Prisma.EnumTicketPriorityFilter;
  }
  if (category && ["WITHDRAWAL", "OFFER_NOT_CREDITED", "ACCOUNT", "KYC", "OTHER"].includes(category)) {
    where.category = category as Prisma.EnumTicketCategoryFilter;
  }
  if (mine) {
    where.assignedTo = admin.id;
  } else if (assignedTo) {
    where.assignedTo = assignedTo === "unassigned" ? null : assignedTo;
  }

  const [tickets, total, statusCounts] = await Promise.all([
    db.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [
        { priority: "desc" },
        { updatedAt: "desc" },
      ],
      skip: offset,
      take: limit,
    }),
    db.supportTicket.count({ where }),
    db.supportTicket.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const s of statusCounts) {
    counts[s.status] = s._count._all;
  }

  return jsonOk({ tickets, total, statusCounts: counts, page, limit });
}, "SUPPORT_AGENT");

export const dynamic = "force-dynamic";
