/**
 * GET /api/user/me/vip — VIP status, tier progress, and level details.
 *
 * Returns the user's current VIP tier, monthly earnings, progress to next tier,
 * level info, XP progress, and all tier configurations for display.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/middleware";
import {
  VIP_TIERS,
  getVipTierConfig,
  getLevelProgress,
} from "@/lib/engagement";

export const GET = withAuth(async (_request, user) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [freshUser, monthlyEarnings] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        xp: true,
        level: true,
        vipTier: true,
        lifetimeEarned: true,
      },
    }),
    db.transaction.aggregate({
      where: {
        userId: user.id,
        amount: { gt: 0 },
        type: {
          in: [
            "OFFER_EARNING",
            "SURVEY_EARNING",
            "REFERRAL_COMMISSION",
            "STREAK_BONUS",
            "RACE_PRIZE",
            "PROMO_CODE",
            "SIGNUP_BONUS",
          ],
        },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    }),
  ]);

  if (!freshUser) {
    return jsonOk({ vip: null });
  }

  const monthlyHoney = monthlyEarnings._sum.amount ?? 0;
  const currentTierConfig = getVipTierConfig(freshUser.vipTier);
  const currentTierIndex = VIP_TIERS.findIndex(
    (t) => t.tier === freshUser.vipTier
  );
  const nextTierConfig =
    currentTierIndex < VIP_TIERS.length - 1
      ? VIP_TIERS[currentTierIndex + 1]
      : null;

  const levelProgress = getLevelProgress(freshUser.xp);

  return jsonOk({
    vip: {
      // Current tier
      currentTier: {
        tier: currentTierConfig.tier,
        name: currentTierConfig.name,
        bonusPercent: currentTierConfig.bonusPercent,
        color: currentTierConfig.color,
        benefits: currentTierConfig.benefits,
      },
      // Monthly progress
      monthlyEarningsHoney: monthlyHoney,
      monthlyEarningsUsd: monthlyHoney / 1000,
      // Progress to next tier
      nextTier: nextTierConfig
        ? {
            tier: nextTierConfig.tier,
            name: nextTierConfig.name,
            bonusPercent: nextTierConfig.bonusPercent,
            color: nextTierConfig.color,
            thresholdHoney: nextTierConfig.monthlyThresholdHoney,
            thresholdUsd: nextTierConfig.monthlyThresholdHoney / 1000,
            remainingHoney: Math.max(
              0,
              nextTierConfig.monthlyThresholdHoney - monthlyHoney
            ),
            progressPercent: Math.min(
              100,
              Math.round(
                (monthlyHoney / nextTierConfig.monthlyThresholdHoney) * 100
              )
            ),
          }
        : null,
      // Level / XP
      level: levelProgress,
      lifetimeEarnedHoney: freshUser.lifetimeEarned,
      lifetimeEarnedUsd: freshUser.lifetimeEarned / 1000,
      // All tiers for display
      allTiers: VIP_TIERS.map((t) => ({
        tier: t.tier,
        name: t.name,
        bonusPercent: t.bonusPercent,
        color: t.color,
        benefits: t.benefits,
        monthlyThresholdHoney: t.monthlyThresholdHoney,
        monthlyThresholdUsd: t.monthlyThresholdHoney / 1000,
        isCurrent: t.tier === freshUser.vipTier,
        isReached: monthlyHoney >= t.monthlyThresholdHoney,
      })),
    },
  });
});
