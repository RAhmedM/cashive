/**
 * POST /api/promo/redeem — Redeem a promo code.
 *
 * Validates the code, checks expiry/usage/one-per-user, then atomically
 * credits the user's balance and records the redemption.
 */
import { db } from "@/lib/db";
import {
  withAuth,
  jsonOk,
  jsonError,
  parseBody,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/middleware";
import { redeemPromoSchema } from "@/lib/validations/user";

export const POST = withAuth(async (request, user) => {
  // Rate limit: 5 attempts per minute per user
  const rateLimited = await rateLimit(
    request,
    { limit: 5, windowMs: 60_000, prefix: "promo", keyBy: "user" },
    user.id
  );
  if (rateLimited) return rateLimited;

  const { data, error } = await parseBody(request, redeemPromoSchema);
  if (error) return error;

  // Look up the promo code
  const promoCode = await db.promoCode.findUnique({
    where: { code: data.code },
  });

  if (!promoCode) {
    return jsonError("Invalid promo code", 404);
  }

  if (!promoCode.isActive) {
    return jsonError("This promo code is no longer active", 400);
  }

  if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
    return jsonError("This promo code has expired", 400);
  }

  if (promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses) {
    return jsonError("This promo code has reached its maximum usage", 400);
  }

  // Check if user already redeemed this code
  const existingRedemption = await db.promoRedemption.findUnique({
    where: {
      userId_promoCodeId: {
        userId: user.id,
        promoCodeId: promoCode.id,
      },
    },
  });

  if (existingRedemption) {
    return jsonError("You have already redeemed this promo code", 409);
  }

  // Atomic: credit balance + record redemption + create transaction + increment usedCount
  const result = await db.$transaction(async (tx) => {
    // Increment usage count
    await tx.promoCode.update({
      where: { id: promoCode.id },
      data: { usedCount: { increment: 1 } },
    });

    // Record redemption
    await tx.promoRedemption.create({
      data: {
        userId: user.id,
        promoCodeId: promoCode.id,
      },
    });

    // Credit user balance
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        balanceHoney: { increment: promoCode.rewardHoney },
        lifetimeEarned: { increment: promoCode.rewardHoney },
      },
      select: { balanceHoney: true },
    });

    // Record transaction
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "PROMO_CODE",
        amount: promoCode.rewardHoney,
        balanceAfter: updatedUser.balanceHoney,
        sourceType: "PROMO",
        sourceId: promoCode.id,
        description: `Promo code: ${promoCode.code}`,
        metadata: {
          promoCodeId: promoCode.id,
          code: promoCode.code,
        },
      },
    });

    return updatedUser;
  });

  // Create notification (non-blocking)
  db.notification
    .create({
      data: {
        userId: user.id,
        type: "promo_redeemed",
        title: `+${promoCode.rewardHoney.toLocaleString()} Honey`,
        body: `Promo code "${promoCode.code}" redeemed successfully!`,
        link: "/rewards",
      },
    })
    .catch(() => {});

  return jsonOk({
    message: "Promo code redeemed successfully",
    reward: {
      honey: promoCode.rewardHoney,
      usd: promoCode.rewardHoney / 1000,
    },
    newBalanceHoney: result.balanceHoney,
  });
});
