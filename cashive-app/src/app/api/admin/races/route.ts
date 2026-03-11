/**
 * GET  /api/admin/races — List all races (admin view)
 * POST /api/admin/races — Create a new race
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody, parseSearchParams } from "@/lib/middleware";
import { createRaceSchema } from "@/lib/validations/engagement";

/**
 * GET — List races with filters.
 *   ?type=DAILY|MONTHLY&active=true|false&page=1&limit=20
 */
export const GET = withAdmin(async (request) => {
  const params = parseSearchParams(request);
  const type = params.get("type") as "DAILY" | "MONTHLY" | null;
  const active = params.get("active");
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const [races, total] = await Promise.all([
    db.race.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { entries: true } },
      },
    }),
    db.race.count({ where }),
  ]);

  return jsonOk({
    races: races.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      prizePool: r.prizePool,
      prizes: r.prizes,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      isActive: r.isActive,
      participantCount: r._count.entries,
      createdAt: r.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * POST — Create a new race.
 */
export const POST = withAdmin(async (request, user) => {
  const { data, error } = await parseBody(request, createRaceSchema);
  if (error) return error;

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);

  if (endsAt <= startsAt) {
    return jsonError("End date must be after start date", 400);
  }

  const race = await db.race.create({
    data: {
      type: data.type,
      title: data.title,
      prizePool: data.prizePool,
      prizes: data.prizes,
      startsAt,
      endsAt,
    },
  });

  // Audit log
  await db.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: "create_race",
      targetType: "race",
      targetId: race.id,
      details: { title: race.title, type: race.type, prizePool: race.prizePool },
    },
  }).catch(() => {});

  return jsonOk({ race }, 201);
});
