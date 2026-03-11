/**
 * GET /api/user/me/achievements — Full achievement list with earned status.
 *
 * Returns all available achievements with whether the user has earned each one,
 * plus the user's current progress toward unearned achievements.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/middleware";

export const GET = withAuth(async (_request, user) => {
  // Fetch all achievements and the user's earned ones
  const [allAchievements, earnedAchievements, userStats] = await Promise.all([
    db.achievement.findMany({
      orderBy: [{ criteriaType: "asc" }, { criteriaValue: "asc" }],
    }),
    db.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievementId: true, earnedAt: true },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        lifetimeEarned: true,
        currentStreak: true,
        _count: {
          select: {
            offerCompletions: true,
            withdrawals: { where: { status: "COMPLETED" } },
            referrals: true,
          },
        },
      },
    }),
  ]);

  if (!userStats) {
    return jsonOk({ achievements: [], stats: { earned: 0, total: 0 } });
  }

  // Build progress map for criteria types
  const progressValues: Record<string, number> = {
    tasks_completed: userStats._count.offerCompletions,
    lifetime_earned_usd: Math.floor(userStats.lifetimeEarned / 1000),
    streak_days: userStats.currentStreak,
    cashouts_completed: userStats._count.withdrawals,
    referrals: userStats._count.referrals,
  };

  const earnedMap = new Map(
    earnedAchievements.map((ea) => [ea.achievementId, ea.earnedAt])
  );

  const achievements = allAchievements.map((a) => {
    const earnedAt = earnedMap.get(a.id) ?? null;
    const earned = earnedAt !== null;
    const currentValue = progressValues[a.criteriaType] ?? 0;

    return {
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      icon: a.icon,
      color: a.color,
      criteriaType: a.criteriaType,
      criteriaValue: a.criteriaValue,
      earned,
      earnedAt,
      progress: earned
        ? { current: a.criteriaValue, target: a.criteriaValue, percent: 100 }
        : {
            current: Math.min(currentValue, a.criteriaValue),
            target: a.criteriaValue,
            percent: Math.min(
              100,
              Math.round((currentValue / a.criteriaValue) * 100)
            ),
          },
    };
  });

  return jsonOk({
    achievements,
    stats: {
      earned: earnedAchievements.length,
      total: allAchievements.length,
    },
  });
});
