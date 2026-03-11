/**
 * Admin Analytics API
 *
 * GET - Returns analytics data for the given period and section.
 *
 * Query params:
 *   section: overview | users | offers | withdrawals | referrals
 *   from: ISO date string (default: 30 days ago)
 *   to: ISO date string (default: now)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, parseSearchParams } from "@/lib/middleware";

export const GET = withAdmin(async (request) => {
  const params = parseSearchParams(request);
  const section = params.get("section") || "overview";
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = params.get("from") ? new Date(params.get("from")!) : thirtyDaysAgo;
  const to = params.get("to") ? new Date(params.get("to")! + "T23:59:59.999Z") : now;

  switch (section) {
    case "overview":
      return jsonOk(await getOverviewAnalytics(from, to));
    case "users":
      return jsonOk(await getUserAnalytics(from, to));
    case "offers":
      return jsonOk(await getOfferAnalytics(from, to));
    case "withdrawals":
      return jsonOk(await getWithdrawalAnalytics(from, to));
    case "referrals":
      return jsonOk(await getReferralAnalytics(from, to));
    default:
      return jsonOk(await getOverviewAnalytics(from, to));
  }
}, "ADMIN");

// ---- Overview ----

async function getOverviewAnalytics(from: Date, to: Date) {
  const [
    totalUsers,
    newUsers,
    totalOfferCompletions,
    totalRevenueCents,
    totalWithdrawalCents,
    pendingWithdrawals,
    activeRaces,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: from, lte: to } } }),
    db.offerCompletion.count({ where: { createdAt: { gte: from, lte: to } } }),
    db.offerCompletion.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: "CREDITED" },
      _sum: { payoutToUsCents: true },
    }),
    db.withdrawal.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: ["COMPLETED", "PROCESSING"] } },
      _sum: { amountUsdCents: true },
    }),
    db.withdrawal.count({ where: { status: "PENDING" } }),
    db.race.count({ where: { status: "ACTIVE" } }),
  ]);

  // Daily new users for the chart
  const dailyUsers = await db.user.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });

  // Bucket into days
  const usersByDay = bucketByDay(
    dailyUsers.map((d) => ({ date: d.createdAt, value: d._count._all })),
    from,
    to
  );

  return {
    section: "overview",
    from: from.toISOString(),
    to: to.toISOString(),
    stats: {
      totalUsers,
      newUsers,
      totalOfferCompletions,
      totalRevenueCents: totalRevenueCents._sum.payoutToUsCents ?? 0,
      totalWithdrawalCents: totalWithdrawalCents._sum.amountUsdCents ?? 0,
      pendingWithdrawals,
      activeRaces,
    },
    charts: {
      dailyNewUsers: usersByDay,
    },
  };
}

// ---- User Analytics ----

async function getUserAnalytics(from: Date, to: Date) {
  const [
    totalUsers,
    newUsers,
    bannedUsers,
    vipBreakdown,
    verifiedUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: from, lte: to } } }),
    db.user.count({ where: { isBanned: true } }),
    db.user.groupBy({
      by: ["vipTier"],
      _count: { _all: true },
    }),
    db.user.count({ where: { emailVerified: true } }),
  ]);

  // Active users (logged in during period)
  const activeUsers = await db.user.count({
    where: { lastLoginAt: { gte: from, lte: to } },
  });

  // Users with referrals
  const usersWithReferrals = await db.user.count({
    where: { referredById: { not: null }, createdAt: { gte: from, lte: to } },
  });

  const vipMap: Record<string, number> = {};
  for (const v of vipBreakdown) {
    vipMap[v.vipTier] = v._count._all;
  }

  return {
    section: "users",
    from: from.toISOString(),
    to: to.toISOString(),
    stats: {
      totalUsers,
      newUsers,
      activeUsers,
      bannedUsers,
      verifiedUsers,
      usersWithReferrals,
    },
    vipBreakdown: vipMap,
  };
}

// ---- Offer Analytics ----

async function getOfferAnalytics(from: Date, to: Date) {
  const [
    totalCompletions,
    statusBreakdown,
    revenueAgg,
    rewardAgg,
  ] = await Promise.all([
    db.offerCompletion.count({ where: { createdAt: { gte: from, lte: to } } }),
    db.offerCompletion.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    db.offerCompletion.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: "CREDITED" },
      _sum: { payoutToUsCents: true },
    }),
    db.offerCompletion.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: "CREDITED" },
      _sum: { rewardToUserHoney: true, platformMarginHoney: true },
    }),
  ]);

  // Top providers — separate query with manual sort
  const topProviderData = await db.offerCompletion.groupBy({
    by: ["providerId"],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
    _sum: { payoutToUsCents: true, rewardToUserHoney: true },
  });

  // Sort by count descending and take top 10
  const topProviders = topProviderData
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 10);

  // Enrich top providers with names
  const providerIds = topProviders.map((p) => p.providerId);
  const providers = providerIds.length > 0
    ? await db.offerwallProvider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, name: true },
      })
    : [];
  const providerMap = new Map(providers.map((p) => [p.id, p.name]));

  const statusMap: Record<string, number> = {};
  for (const s of statusBreakdown) {
    statusMap[s.status] = s._count._all;
  }

  return {
    section: "offers",
    from: from.toISOString(),
    to: to.toISOString(),
    stats: {
      totalCompletions,
      totalRevenueCents: revenueAgg._sum.payoutToUsCents ?? 0,
      totalRewardHoney: rewardAgg._sum.rewardToUserHoney ?? 0,
      totalMarginHoney: rewardAgg._sum.platformMarginHoney ?? 0,
    },
    statusBreakdown: statusMap,
    topProviders: topProviders.map((p) => ({
      providerId: p.providerId,
      providerName: providerMap.get(p.providerId) ?? "Unknown",
      completions: p._count._all,
      revenueCents: p._sum?.payoutToUsCents ?? 0,
      rewardHoney: p._sum?.rewardToUserHoney ?? 0,
    })),
  };
}

// ---- Withdrawal Analytics ----

async function getWithdrawalAnalytics(from: Date, to: Date) {
  const [
    totalWithdrawals,
    statusBreakdown,
    totalAmountAgg,
    avgAmountAgg,
  ] = await Promise.all([
    db.withdrawal.count({ where: { createdAt: { gte: from, lte: to } } }),
    db.withdrawal.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
      _sum: { amountUsdCents: true },
    }),
    db.withdrawal.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: ["COMPLETED", "PROCESSING"] } },
      _sum: { amountUsdCents: true, feeUsdCents: true },
    }),
    db.withdrawal.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      _avg: { amountUsdCents: true },
    }),
  ]);

  // Method breakdown — separate query with manual sort
  const methodData = await db.withdrawal.groupBy({
    by: ["method"],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
    _sum: { amountUsdCents: true },
  });

  const methodBreakdown = methodData
    .sort((a, b) => b._count._all - a._count._all);

  const statusMap: Record<string, { count: number; amountCents: number }> = {};
  for (const s of statusBreakdown) {
    statusMap[s.status] = {
      count: s._count._all,
      amountCents: s._sum?.amountUsdCents ?? 0,
    };
  }

  return {
    section: "withdrawals",
    from: from.toISOString(),
    to: to.toISOString(),
    stats: {
      totalWithdrawals,
      totalAmountCents: totalAmountAgg._sum.amountUsdCents ?? 0,
      totalFeeCents: totalAmountAgg._sum.feeUsdCents ?? 0,
      avgAmountCents: Math.round(avgAmountAgg._avg.amountUsdCents ?? 0),
    },
    statusBreakdown: statusMap,
    methodBreakdown: methodBreakdown.map((m) => ({
      method: m.method,
      count: m._count._all,
      amountCents: m._sum?.amountUsdCents ?? 0,
    })),
  };
}

// ---- Referral Analytics ----

async function getReferralAnalytics(from: Date, to: Date) {
  const [
    totalReferrals,
    referralEarningsAgg,
  ] = await Promise.all([
    db.user.count({
      where: { referredById: { not: null }, createdAt: { gte: from, lte: to } },
    }),
    db.referralEarning.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _sum: { commissionHoney: true },
      _count: { _all: true },
    }),
  ]);

  // Top referrers — separate query with manual sort
  const topReferrerData = await db.referralEarning.groupBy({
    by: ["referrerId"],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
    _sum: { commissionHoney: true },
  });

  const topReferrers = topReferrerData
    .sort((a, b) => (b._sum?.commissionHoney ?? 0) - (a._sum?.commissionHoney ?? 0))
    .slice(0, 10);

  // Enrich top referrers with usernames
  const referrerIds = topReferrers.map((r) => r.referrerId);
  const referrers = referrerIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, username: true },
      })
    : [];
  const referrerMap = new Map(referrers.map((u) => [u.id, u.username]));

  return {
    section: "referrals",
    from: from.toISOString(),
    to: to.toISOString(),
    stats: {
      totalReferrals,
      totalEarnings: referralEarningsAgg._count._all,
      totalEarningsHoney: referralEarningsAgg._sum.commissionHoney ?? 0,
    },
    topReferrers: topReferrers.map((r) => ({
      userId: r.referrerId,
      username: referrerMap.get(r.referrerId) ?? "Unknown",
      earnings: r._count._all,
      totalHoney: r._sum?.commissionHoney ?? 0,
    })),
  };
}

// ---- Helpers ----

function bucketByDay(
  entries: { date: Date; value: number }[],
  from: Date,
  to: Date
): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + e.value);
  }

  const result: { date: string; value: number }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export const dynamic = "force-dynamic";
