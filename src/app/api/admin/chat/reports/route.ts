/**
 * Admin Chat Reports API
 *
 * GET - List chat reports with filters (status, pagination)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, parseSearchParams } from "@/lib/middleware";
import type { Prisma } from "@/generated/prisma";

export const GET = withAdmin(async (request, admin) => {
  const params = parseSearchParams(request);
  const status = params.get("status") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const where: Prisma.ChatReportWhereInput = {};
  if (status && ["PENDING", "REVIEWED", "DISMISSED"].includes(status)) {
    where.status = status as "PENDING" | "REVIEWED" | "DISMISSED";
  }

  const [reports, total, pendingCount] = await Promise.all([
    db.chatReport.findMany({
      where,
      include: {
        message: {
          include: {
            user: { select: { id: true, username: true, email: true, chatMuted: true, chatMutedUntil: true } },
          },
        },
        reporter: { select: { id: true, username: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    db.chatReport.count({ where }),
    db.chatReport.count({ where: { status: "PENDING" } }),
  ]);

  return jsonOk({ reports, total, pendingCount, page, limit });
}, "MODERATOR");

export const dynamic = "force-dynamic";
