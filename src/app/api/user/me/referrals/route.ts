/**
 * GET /api/user/me/referrals — Referral dashboard with stats, tier, and referred users.
 *
 * Returns the user's referral stats, commission tier info, referred user list,
 * and progress to the next tier.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, parseSearchParams } from "@/lib/middleware";

/** Referral tier configuration */
const REFERRAL_TIERS = [
  { tier: 1, name: "Starter", commissionRate: 0.05, requiredActive: 0 },
  { tier: 2, name: "Bronze", commissionRate: 0.10, requiredActive: 5 },
  { tier: 3, name: "Silver", commissionRate: 0.15, requiredActive: 15 },
  { tier: 4, name: "Gold", commissionRate: 0.20, requiredActive: 50 },
];

export const GET = withAuth(async (request, user) => {
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    freshUser,
    totalReferrals,
    referredUsers,
    totalCommissionResult,
    activeThisMonth,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        referralCode: true,
        referralTier: true,
      },
    }),
    // Total count of referred users
    db.user.count({
      where: { referredById: user.id },
    }),
    // Paginated list of referred users with their earnings/commission data
    db.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        username: true,
        createdAt: true,
        lifetimeEarned: true,
        _count: {
          select: { offerCompletions: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    // Total commission earned from referrals (all time)
    db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "REFERRAL_COMMISSION",
      },
      _sum: { amount: true },
    }),
    // Active referrals this month (who have completed at least 1 offer in last 30 days)
    db.user.count({
      where: {
        referredById: user.id,
        offerCompletions: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
    }),
  ]);

  if (!freshUser) {
    return jsonOk({ referrals: null });
  }

  // Get commission earned from each referred user via ReferralEarning model
  const referredUserIds = referredUsers.map((u) => u.id);

  let commissionByUser: Map<string, number> = new Map();
  if (referredUserIds.length > 0) {
    const commissions = await db.referralEarning.groupBy({
      by: ["earnerId"],
      where: {
        referrerId: user.id,
        earnerId: { in: referredUserIds },
      },
      _sum: { commissionHoney: true },
    });
    commissionByUser = new Map(
      commissions.map((c) => [c.earnerId, c._sum.commissionHoney ?? 0])
    );
  }

  const currentTier = REFERRAL_TIERS.find((t) => t.tier === freshUser.referralTier) ?? REFERRAL_TIERS[0];
  const nextTier = REFERRAL_TIERS.find((t) => t.tier === freshUser.referralTier + 1) ?? null;

  const totalCommissionHoney = totalCommissionResult._sum.amount ?? 0;

  return jsonOk({
    referrals: {
      // Stats
      stats: {
        totalReferrals,
        activeThisMonth,
        totalEarnedHoney: totalCommissionHoney,
        totalEarnedUsd: totalCommissionHoney / 1000,
      },
      // Referral link info
      referralCode: freshUser.referralCode,
      // Current tier
      currentTier: {
        tier: currentTier.tier,
        name: currentTier.name,
        commissionRate: currentTier.commissionRate,
        commissionPercent: Math.round(currentTier.commissionRate * 100),
      },
      // Next tier progress
      nextTier: nextTier
        ? {
            tier: nextTier.tier,
            name: nextTier.name,
            commissionRate: nextTier.commissionRate,
            commissionPercent: Math.round(nextTier.commissionRate * 100),
            requiredActive: nextTier.requiredActive,
            currentActive: activeThisMonth,
            remaining: Math.max(0, nextTier.requiredActive - activeThisMonth),
            progressPercent: Math.min(
              100,
              Math.round((activeThisMonth / nextTier.requiredActive) * 100)
            ),
          }
        : null,
      // All tiers for display
      allTiers: REFERRAL_TIERS.map((t) => ({
        ...t,
        commissionPercent: Math.round(t.commissionRate * 100),
        isCurrent: t.tier === freshUser.referralTier,
      })),
      // Referred users
      users: referredUsers.map((u) => ({
        username: u.username,
        joinedAt: u.createdAt,
        theirEarningsHoney: u.lifetimeEarned,
        theirEarningsUsd: u.lifetimeEarned / 1000,
        yourCommissionHoney: commissionByUser.get(u.id) ?? 0,
        yourCommissionUsd: (commissionByUser.get(u.id) ?? 0) / 1000,
        offersCompleted: u._count.offerCompletions,
      })),
      pagination: {
        page,
        limit,
        total: totalReferrals,
        totalPages: Math.ceil(totalReferrals / limit),
      },
    },
  });
});
