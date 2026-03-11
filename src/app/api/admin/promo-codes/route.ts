/**
 * GET  /api/admin/promo-codes — List all promo codes
 * POST /api/admin/promo-codes — Create a new promo code
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody, parseSearchParams } from "@/lib/middleware";
import { createPromoCodeSchema } from "@/lib/validations/engagement";

/**
 * GET — List promo codes with optional filters.
 *   ?active=true|false&page=1&limit=20
 */
export const GET = withAdmin(async (request) => {
  const params = parseSearchParams(request);
  const active = params.get("active");
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const [codes, total] = await Promise.all([
    db.promoCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { redemptions: true } },
      },
    }),
    db.promoCode.count({ where }),
  ]);

  return jsonOk({
    promoCodes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      rewardHoney: c.rewardHoney,
      rewardUsd: c.rewardHoney / 1000,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      redemptionCount: c._count.redemptions,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * POST — Create a new promo code.
 */
export const POST = withAdmin(async (request, user) => {
  const { data, error } = await parseBody(request, createPromoCodeSchema);
  if (error) return error;

  // Check if code already exists
  const existing = await db.promoCode.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    return jsonError("A promo code with this code already exists", 409);
  }

  const promoCode = await db.promoCode.create({
    data: {
      code: data.code,
      rewardHoney: data.rewardHoney,
      maxUses: data.maxUses ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
    },
  });

  await db.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: "create_promo_code",
      targetType: "promo_code",
      targetId: promoCode.id,
      details: {
        code: promoCode.code,
        rewardHoney: promoCode.rewardHoney,
        maxUses: promoCode.maxUses,
      },
    },
  }).catch(() => {});

  return jsonOk({ promoCode }, 201);
});
