/**
 * Admin Audit Log API
 *
 * GET - List audit log entries with filters (admin, action, target, date range)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, parseSearchParams } from "@/lib/middleware";
import type { Prisma } from "@/generated/prisma";

export const GET = withAdmin(async (request) => {
  const params = parseSearchParams(request);
  const adminId = params.get("adminId") || "";
  const action = params.get("action") || "";
  const targetType = params.get("targetType") || "";
  const targetId = params.get("targetId") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const search = params.get("search") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (adminId) {
    where.adminId = adminId;
  }

  if (action) {
    where.action = { contains: action, mode: "insensitive" };
  }

  if (targetType) {
    where.targetType = targetType;
  }

  if (targetId) {
    where.targetId = targetId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    }
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { targetType: { contains: search, mode: "insensitive" } },
      { targetId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        admin: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  // Fetch list of admins for the filter dropdown
  const admins = await db.adminUser.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Fetch distinct target types for filter
  const targetTypes = await db.auditLog.findMany({
    where: { targetType: { not: null } },
    select: { targetType: true },
    distinct: ["targetType"],
  });

  return jsonOk({
    logs,
    total,
    page,
    limit,
    admins,
    targetTypes: targetTypes.map((t) => t.targetType).filter(Boolean),
  });
}, "ADMIN");

export const dynamic = "force-dynamic";
