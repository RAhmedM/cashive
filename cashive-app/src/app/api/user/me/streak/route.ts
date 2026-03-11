/**
 * GET /api/user/me/streak — Current streak status with daily claim schedule.
 *
 * Returns the user's current streak, longest streak, and a 7-day
 * daily reward schedule showing which days are completed.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/middleware";

/** Daily streak reward schedule (Honey per day, repeating every 7 days) */
const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];

export const GET = withAuth(async (_request, user) => {
  const freshUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastEarnDate: true,
    },
  });

  if (!freshUser) {
    return jsonOk({ streak: null });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastEarn = freshUser.lastEarnDate
    ? new Date(freshUser.lastEarnDate)
    : null;
  if (lastEarn) lastEarn.setHours(0, 0, 0, 0);

  // Determine if streak is still active
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let effectiveStreak = freshUser.currentStreak;
  let earnedToday = false;

  if (lastEarn) {
    if (lastEarn.getTime() === today.getTime()) {
      // Earned today — streak is active and today is counted
      earnedToday = true;
    } else if (lastEarn.getTime() === yesterday.getTime()) {
      // Last earned yesterday — streak still alive but hasn't been extended today yet
      earnedToday = false;
    } else {
      // Streak is broken (more than 1 day gap)
      effectiveStreak = 0;
    }
  }

  // Build the 7-day schedule
  // The user's current position in the 7-day cycle
  const cycleDay = effectiveStreak > 0 ? ((effectiveStreak - 1) % 7) : 0;

  const days = DAILY_REWARDS.map((reward, index) => ({
    day: index + 1,
    reward,
    completed: effectiveStreak > 0 && index <= cycleDay && (index < cycleDay || earnedToday),
    isCurrent: effectiveStreak > 0 && index === cycleDay && !earnedToday,
  }));

  // Next milestone info
  const nextSevenDay = effectiveStreak > 0
    ? 7 - (effectiveStreak % 7 || 7) + effectiveStreak
    : 7;
  const nextThirtyDay = effectiveStreak > 0
    ? 30 - (effectiveStreak % 30 || 30) + effectiveStreak
    : 30;

  return jsonOk({
    streak: {
      currentStreak: effectiveStreak,
      longestStreak: freshUser.longestStreak,
      lastEarnDate: freshUser.lastEarnDate,
      earnedToday,
      days,
      nextMilestones: {
        sevenDay: {
          target: nextSevenDay,
          daysRemaining: nextSevenDay - effectiveStreak,
          bonus: 100,
        },
        thirtyDay: {
          target: nextThirtyDay,
          daysRemaining: nextThirtyDay - effectiveStreak,
          bonus: 500,
        },
      },
    },
  });
});
