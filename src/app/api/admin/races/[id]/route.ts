/**
 * GET    /api/admin/races/[id] — Get race details (admin)
 * PATCH  /api/admin/races/[id] — Update a race
 * DELETE /api/admin/races/[id] — Delete a race (only if no entries)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { updateRaceSchema } from "@/lib/validations/engagement";

/**
 * GET — Full race details with entry count.
 */
export const GET = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Race ID is required", 400);

  const race = await db.race.findUnique({
    where: { id },
    include: {
      _count: { select: { entries: true } },
      entries: {
        orderBy: { points: "desc" },
        take: 10,
      },
    },
  });

  if (!race) return jsonError("Race not found", 404);

  // Fetch usernames for top entries
  const userIds = race.entries.map((e) => e.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return jsonOk({
    race: {
      id: race.id,
      type: race.type,
      title: race.title,
      prizePoolUsdCents: race.prizePoolUsdCents,
      prizeDistribution: race.prizeDistribution,
      startsAt: race.startsAt,
      endsAt: race.endsAt,
      status: race.status,
      participantCount: race._count.entries,
      createdAt: race.createdAt,
      topEntries: race.entries.map((e, i) => ({
        rank: i + 1,
        userId: e.userId,
        username: userMap.get(e.userId)?.username ?? "Unknown",
        email: userMap.get(e.userId)?.email ?? "",
        points: e.points,
        prizeHoney: e.prizeHoney,
      })),
    },
  });
});

/**
 * PATCH — Update race fields.
 */
export const PATCH = withAdmin(async (request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Race ID is required", 400);

  const existing = await db.race.findUnique({ where: { id } });
  if (!existing) return jsonError("Race not found", 404);

  const { data, error } = await parseBody(request, updateRaceSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.prizePoolUsdCents !== undefined) updateData.prizePoolUsdCents = data.prizePoolUsdCents;
  if (data.prizeDistribution !== undefined) updateData.prizeDistribution = data.prizeDistribution;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
  if (data.endsAt !== undefined) updateData.endsAt = new Date(data.endsAt);

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update", 400);
  }

  const updated = await db.race.update({ where: { id }, data: updateData });

  await db.auditLog.create({
    data: {
      adminId: user.id,
      action: "update_race",
      targetType: "race",
      targetId: id,
      afterState: updateData as Record<string, unknown> as import("@/generated/prisma").Prisma.InputJsonValue,
    },
  }).catch(() => {});

  return jsonOk({ race: updated });
});

/**
 * DELETE — Delete a race (only if it has no entries).
 */
export const DELETE = withAdmin(async (_request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Race ID is required", 400);

  const race = await db.race.findUnique({
    where: { id },
    include: { _count: { select: { entries: true } } },
  });

  if (!race) return jsonError("Race not found", 404);

  if (race._count.entries > 0) {
    return jsonError(
      "Cannot delete a race with participants. Deactivate it instead.",
      400
    );
  }

  await db.race.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      adminId: user.id,
      action: "delete_race",
      targetType: "race",
      targetId: id,
      afterState: { title: race.title },
    },
  }).catch(() => {});

  return jsonOk({ message: "Race deleted" });
});
