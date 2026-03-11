/**
 * GET    /api/admin/promo-codes/[id] — Get promo code details
 * PATCH  /api/admin/promo-codes/[id] — Update a promo code
 * DELETE /api/admin/promo-codes/[id] — Delete a promo code (only if no redemptions)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { updatePromoCodeSchema } from "@/lib/validations/engagement";

/**
 * GET — Promo code details with recent redemptions.
 */
export const GET = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Promo code ID is required", 400);

  const promoCode = await db.promoCode.findUnique({
    where: { id },
    include: {
      redemptions: {
        orderBy: { redeemedAt: "desc" },
        take: 20,
      },
      _count: { select: { redemptions: true } },
    },
  });

  if (!promoCode) return jsonError("Promo code not found", 404);

  // Fetch usernames for redemptions
  const userIds = promoCode.redemptions.map((r) => r.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return jsonOk({
    promoCode: {
      id: promoCode.id,
      code: promoCode.code,
      rewardHoney: promoCode.rewardHoney,
      rewardUsd: promoCode.rewardHoney / 1000,
      maxUses: promoCode.maxUses,
      usedCount: promoCode.usedCount,
      redemptionCount: promoCode._count.redemptions,
      expiresAt: promoCode.expiresAt,
      isActive: promoCode.isActive,
      createdAt: promoCode.createdAt,
      recentRedemptions: promoCode.redemptions.map((r) => ({
        userId: r.userId,
        username: userMap.get(r.userId)?.username ?? "Unknown",
        email: userMap.get(r.userId)?.email ?? "",
        redeemedAt: r.redeemedAt,
      })),
    },
  });
});

/**
 * PATCH — Update promo code fields.
 */
export const PATCH = withAdmin(async (request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Promo code ID is required", 400);

  const existing = await db.promoCode.findUnique({ where: { id } });
  if (!existing) return jsonError("Promo code not found", 404);

  const { data, error } = await parseBody(request, updatePromoCodeSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = {};
  if (data.rewardHoney !== undefined) updateData.rewardHoney = data.rewardHoney;
  if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
  if (data.expiresAt !== undefined)
    updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const updated = await db.promoCode.update({ where: { id }, data: updateData });

  await db.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: "update_promo_code",
      targetType: "promo_code",
      targetId: id,
      details: { code: existing.code, changes: updateData } as Record<string, unknown> as import("@/generated/prisma").Prisma.InputJsonValue,
    },
  }).catch(() => {});

  return jsonOk({ promoCode: updated });
});

/**
 * DELETE — Delete a promo code (only if it has no redemptions).
 */
export const DELETE = withAdmin(async (_request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Promo code ID is required", 400);

  const promoCode = await db.promoCode.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });

  if (!promoCode) return jsonError("Promo code not found", 404);

  if (promoCode._count.redemptions > 0) {
    return jsonError(
      "Cannot delete a promo code that has been redeemed. Deactivate it instead.",
      400
    );
  }

  await db.promoCode.delete({ where: { id } });

  await db.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: "delete_promo_code",
      targetType: "promo_code",
      targetId: id,
      details: { code: promoCode.code },
    },
  }).catch(() => {});

  return jsonOk({ message: "Promo code deleted" });
});
