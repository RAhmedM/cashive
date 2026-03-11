/**
 * GET /api/ticker/recent
 *
 * Public endpoint — returns the most recent activity ticker events.
 * Reads from Redis list (populated by postback side effects).
 * Falls back to recent offer completions from Postgres if Redis is empty.
 *
 * Query params:
 *   - limit: number of events (default 20, max 50)
 */
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { jsonOk } from "@/lib/middleware";

interface TickerEvent {
  type: string;
  username: string;
  amount: number;
  offerName: string;
  provider: string;
  timestamp: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 50);

  // Try Redis first (fast path — populated by postback side effects)
  try {
    const events = await redis.lrange("ticker:events", 0, limit - 1);
    if (events.length > 0) {
      const parsed: TickerEvent[] = events.map((e) => JSON.parse(e));
      return jsonOk({ events: parsed });
    }
  } catch {
    // Redis unavailable — fall through to Postgres
  }

  // Fallback: build ticker from recent offer completions
  const completions = await db.offerCompletion.findMany({
    where: { status: "CREDITED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      rewardToUserHoney: true,
      offerName: true,
      createdAt: true,
      user: {
        select: { username: true, anonymousOnLeaderboard: true },
      },
      provider: {
        select: { name: true },
      },
    },
  });

  const events: TickerEvent[] = completions.map((c) => ({
    type: "earning",
    username: c.user.anonymousOnLeaderboard
      ? `${c.user.username.slice(0, 2)}***`
      : c.user.username,
    amount: c.rewardToUserHoney,
    offerName: c.offerName,
    provider: c.provider.name,
    timestamp: c.createdAt.getTime(),
  }));

  return jsonOk({ events });
}
