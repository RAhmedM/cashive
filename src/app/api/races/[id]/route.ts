/**
 * GET /api/races/[id] — Race details with leaderboard.
 *
 * Returns full race info including paginated leaderboard.
 * Public endpoint, but includes user's position if authenticated.
 */
import { db } from "@/lib/db";
import { jsonOk, jsonError, parseSearchParams } from "@/lib/middleware";
import { getSessionUser } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "50", 10)));

  const race = await db.race.findUnique({
    where: { id },
    include: {
      _count: { select: { entries: true } },
    },
  });

  if (!race) {
    return jsonError("Race not found", 404);
  }

  // Try Redis sorted set first for active races (faster)
  let leaderboard: Array<{
    userId: string;
    username: string;
    points: number;
    rank: number;
    isUser: boolean;
  }> = [];

  const sessionUser = await getSessionUser();
  const redisKey = `race:${id}:leaderboard`;
  let useRedis = false;

  if (race.status === "ACTIVE") {
    try {
      // Get leaderboard from Redis sorted set (ZREVRANGE with scores)
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      const results = await redis.zrevrange(redisKey, start, end, "WITHSCORES");

      if (results.length > 0) {
        useRedis = true;
        // Results come as [member1, score1, member2, score2, ...]
        const entries: Array<{ userId: string; points: number }> = [];
        for (let i = 0; i < results.length; i += 2) {
          entries.push({
            userId: results[i],
            points: parseInt(results[i + 1], 10),
          });
        }

        // Fetch usernames for these user IDs
        const userIds = entries.map((e) => e.userId);
        const users = await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, anonymousOnLeaderboard: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        leaderboard = entries.map((entry, index) => {
          const u = userMap.get(entry.userId);
          const displayName = u
            ? u.anonymousOnLeaderboard
              ? `${u.username.slice(0, 2)}***`
              : u.username
            : "Unknown";

          return {
            userId: entry.userId,
            username: displayName,
            points: entry.points,
            rank: start + index + 1,
            isUser: sessionUser?.id === entry.userId,
          };
        });
      }
    } catch {
      // Redis unavailable, fall through to Postgres
    }
  }

  // Fallback to Postgres
  if (!useRedis) {
    const skip = (page - 1) * limit;
    const entries = await db.raceEntry.findMany({
      where: { raceId: id },
      orderBy: { points: "desc" },
      skip,
      take: limit,
      include: {
        race: false,
      },
    });

    // Fetch usernames
    const userIds = entries.map((e) => e.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, anonymousOnLeaderboard: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    leaderboard = entries.map((entry, index) => {
      const u = userMap.get(entry.userId);
      const displayName = u
        ? u.anonymousOnLeaderboard
          ? `${u.username.slice(0, 2)}***`
          : u.username
        : "Unknown";

      return {
        userId: entry.userId,
        username: displayName,
        points: entry.points,
        rank: entry.finalRank ?? skip + index + 1,
        isUser: sessionUser?.id === entry.userId,
      };
    });
  }

  // Get user's own position if authenticated and not in the current page
  let userPosition: { points: number; rank: number } | null = null;
  if (sessionUser) {
    const userEntry = await db.raceEntry.findUnique({
      where: { raceId_userId: { raceId: id, userId: sessionUser.id } },
      select: { points: true },
    });

    if (userEntry) {
      const higherCount = await db.raceEntry.count({
        where: { raceId: id, points: { gt: userEntry.points } },
      });
      userPosition = {
        points: userEntry.points,
        rank: higherCount + 1,
      };
    }
  }

  // Prize breakdown
  const prizes = race.prizeDistribution as Array<{ rank: number; amount: number }>;

  return jsonOk({
    race: {
      id: race.id,
      type: race.type,
      title: race.title,
      prizePoolUsdCents: race.prizePoolUsdCents,
      prizes,
      startsAt: race.startsAt,
      endsAt: race.endsAt,
      status: race.status,
      participantCount: race._count.entries,
    },
    leaderboard,
    userPosition,
    pagination: {
      page,
      limit,
      total: race._count.entries,
      totalPages: Math.ceil(race._count.entries / limit),
    },
  });
}
