/**
 * GET /api/admin/withdrawals
 *
 * Admin endpoint — list withdrawals with filters.
 *
 * Query params:
 *   - status:  filter by status (PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED, FAILED)
 *   - method:  filter by method (PAYPAL, BITCOIN, etc.)
 *   - userId:  filter by user
 *   - limit:   max results (default 50, max 200)
 *   - offset:  pagination offset
 *   - sort:    "newest" (default) or "oldest"
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/middleware";
import type { WithdrawalStatus, WithdrawalMethod } from "@/generated/prisma";

export const GET = withAdmin(async (request) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as WithdrawalStatus | null;
  const method = url.searchParams.get("method") as WithdrawalMethod | null;
  const userId = url.searchParams.get("userId");
  const sort = url.searchParams.get("sort") === "oldest" ? "asc" as const : "desc" as const;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0
  );

  const where = {
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(userId ? { userId } : {}),
  };

  const [withdrawals, total, statusCounts] = await Promise.all([
    db.withdrawal.findMany({
      where,
      orderBy: { createdAt: sort },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fraudScore: true,
            isBanned: true,
            kycStatus: true,
            lifetimeEarned: true,
          },
        },
      },
    }),
    db.withdrawal.count({ where }),
    // Get counts by status for dashboard overview
    Promise.all([
      db.withdrawal.count({ where: { status: "PENDING" } }),
      db.withdrawal.count({ where: { status: "APPROVED" } }),
      db.withdrawal.count({ where: { status: "PROCESSING" } }),
    ]),
  ]);

  return jsonOk({
    withdrawals,
    total,
    limit,
    offset,
    statusCounts: {
      pending: statusCounts[0],
      approved: statusCounts[1],
      processing: statusCounts[2],
    },
  });
});
