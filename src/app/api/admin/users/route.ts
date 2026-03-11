/**
 * GET /api/admin/users
 *
 * Admin endpoint — list users with search, filters, and pagination.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/middleware";
import type { Prisma, VipTier } from "@/generated/prisma";

export const GET = withAdmin(async (request) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const vipTier = url.searchParams.get("vipTier") as VipTier | null;
  const banned = url.searchParams.get("banned");
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" as const : "desc" as const;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0
  );

  // Build where clause
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { id: search },
    ];
  }

  if (vipTier) {
    where.vipTier = vipTier;
  }

  if (banned === "true") {
    where.isBanned = true;
  } else if (banned === "false") {
    where.isBanned = false;
  }

  // Build orderBy
  const validSortFields = [
    "createdAt",
    "username",
    "email",
    "balanceHoney",
    "lifetimeEarned",
    "fraudScore",
    "vipTier",
  ];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const orderBy = { [orderField]: sortDir };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        username: true,
        email: true,
        balanceHoney: true,
        lifetimeEarned: true,
        vipTier: true,
        fraudScore: true,
        isBanned: true,
        country: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return jsonOk({ users, total, limit, offset });
});
