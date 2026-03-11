/**
 * GET /api/user/me/transactions
 *
 * Paginated transaction history with type filtering.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, parseSearchParams } from "@/lib/middleware";
import { TransactionType } from "@/generated/prisma";

export const GET = withAuth(async (request, user) => {
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));
  const typeFilter = params.get("type") as TransactionType | null;
  const skip = (page - 1) * limit;

  const where = {
    userId: user.id,
    ...(typeFilter && Object.values(TransactionType).includes(typeFilter)
      ? { type: typeFilter }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    }),
    db.transaction.count({ where }),
  ]);

  return jsonOk({
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
