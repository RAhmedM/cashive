/**
 * GET /api/stats/platform
 *
 * Public endpoint — returns aggregate platform statistics for display
 * on the homepage and various UI elements.
 *
 * Cached in Redis for 5 minutes to avoid expensive COUNT queries on every request.
 */
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { jsonOk } from "@/lib/middleware";

const CACHE_KEY = "stats:platform";
const CACHE_TTL_SECONDS = 300; // 5 minutes

interface PlatformStats {
  totalUsers: number;
  totalPaidOutUsd: number;
  totalOffersCompleted: number;
  activeProviders: number;
  /** Honey earned across all users (lifetime) */
  totalHoneyEarned: number;
}

export async function GET() {
  // Try cache first
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return jsonOk(JSON.parse(cached) as PlatformStats);
    }
  } catch {
    // Redis unavailable — compute fresh
  }

  // Compute stats from Postgres
  const [
    totalUsers,
    totalOffersCompleted,
    activeProviders,
    aggregates,
    totalPaidOut,
  ] = await Promise.all([
    db.user.count(),
    db.offerCompletion.count({ where: { status: "CREDITED" } }),
    db.offerwallProvider.count({ where: { isActive: true } }),
    db.user.aggregate({ _sum: { lifetimeEarned: true } }),
    db.withdrawal.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amountUsd: true },
    }),
  ]);

  const stats: PlatformStats = {
    totalUsers,
    totalPaidOutUsd: totalPaidOut._sum.amountUsd ?? 0,
    totalOffersCompleted,
    activeProviders,
    totalHoneyEarned: aggregates._sum.lifetimeEarned ?? 0,
  };

  // Cache the result
  try {
    await redis.set(CACHE_KEY, JSON.stringify(stats), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Cache miss is fine — just serve fresh
  }

  return jsonOk(stats);
}
