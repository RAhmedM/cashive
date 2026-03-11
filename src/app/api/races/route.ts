/**
 * GET /api/races — List active races.
 *
 * Returns active races with basic info. Supports filtering by type (DAILY/MONTHLY).
 * Public endpoint (no auth required), but if authenticated, includes the user's
 * position in each race.
 */
import { db } from "@/lib/db";
import { jsonOk, parseSearchParams } from "@/lib/middleware";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const params = parseSearchParams(request);
  const type = params.get("type") as "DAILY" | "MONTHLY" | null;
  const includeEnded = params.get("ended") === "true";

  const now = new Date();

  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  if (includeEnded) {
    // Show races that ended in the last 7 days + active ones
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    where.OR = [
      { status: "ACTIVE", startsAt: { lte: now } },
      { endsAt: { gte: sevenDaysAgo } },
    ];
  } else {
    where.status = "ACTIVE";
    where.startsAt = { lte: now };
    where.endsAt = { gt: now };
  }

  const races = await db.race.findMany({
    where,
    orderBy: [{ type: "asc" }, { endsAt: "asc" }],
    include: {
      _count: { select: { entries: true } },
    },
  });

  // If authenticated, include user's position in each race
  const sessionUser = await getSessionUser();
  let userEntries: Map<string, { points: number; rank: number }> = new Map();

  if (sessionUser) {
    const entries = await db.raceEntry.findMany({
      where: {
        userId: sessionUser.id,
        raceId: { in: races.map((r) => r.id) },
      },
      select: { raceId: true, points: true },
    });

    // Calculate rank for each entry
    for (const entry of entries) {
      const higherCount = await db.raceEntry.count({
        where: {
          raceId: entry.raceId,
          points: { gt: entry.points },
        },
      });
      userEntries.set(entry.raceId, {
        points: entry.points,
        rank: higherCount + 1,
      });
    }
  }

  return jsonOk({
    races: races.map((race) => {
      const userEntry = userEntries.get(race.id);
      return {
        id: race.id,
        type: race.type,
        title: race.title,
        prizePoolUsdCents: race.prizePoolUsdCents,
        prizeDistribution: race.prizeDistribution,
        startsAt: race.startsAt,
        endsAt: race.endsAt,
        status: race.status,
        participantCount: race._count.entries,
        userPosition: userEntry
          ? {
              points: userEntry.points,
              rank: userEntry.rank,
            }
          : null,
      };
    }),
  });
}
