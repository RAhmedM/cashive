/**
 * POST /api/admin/races/[id]/distribute — Distribute prizes for a completed race.
 *
 * Triggers prize distribution for a race that has ended.
 * Awards prizes to top-ranked participants based on the race's prize structure.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError } from "@/lib/middleware";
import { distributeRacePrizes } from "@/lib/engagement";

export const POST = withAdmin(async (_request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Race ID is required", 400);

  const race = await db.race.findUnique({
    where: { id },
    select: { id: true, title: true, endsAt: true, isActive: true },
  });

  if (!race) return jsonError("Race not found", 404);

  // Check if race has ended
  if (race.endsAt > new Date()) {
    return jsonError("Race has not ended yet", 400);
  }

  // Check if prizes were already distributed (race deactivated)
  if (!race.isActive) {
    return jsonError(
      "Prizes have already been distributed for this race",
      409
    );
  }

  try {
    const result = await distributeRacePrizes(id);

    await db.adminAuditLog.create({
      data: {
        adminId: user.id,
        action: "distribute_race_prizes",
        targetType: "race",
        targetId: id,
        details: {
          title: race.title,
          winnersCount: result.winnersCount,
          totalDistributedHoney: result.totalDistributed,
        },
      },
    }).catch(() => {});

    return jsonOk({
      message: `Prizes distributed for "${race.title}"`,
      winnersCount: result.winnersCount,
      totalDistributedHoney: result.totalDistributed,
      totalDistributedUsd: result.totalDistributed / 1000,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to distribute prizes";
    return jsonError(message, 500);
  }
});
