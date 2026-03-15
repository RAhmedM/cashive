/**
 * Postback side effects.
 *
 * These run AFTER the core postback credit succeeds. They are non-critical —
 * if any of them fail, the user still gets their credit. Eventually these
 * should be queued as BullMQ jobs. Currently they run inline but are wrapped
 * in try/catch so failures don't affect the postback response.
 *
 * Real-time events are published to Redis Pub/Sub channels, which the
 * Socket.IO server (src/socket/server.ts) subscribes to and broadcasts.
 */
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { postbackLogger } from "@/lib/logger";
import { awardXp, recalculateVipTier } from "@/lib/engagement";
import type { PostbackSideEffectPayload } from "./types";

/**
 * Run all side effects for a successful postback credit.
 * Each effect is independent and wrapped in try/catch.
 */
export async function runPostbackSideEffects(
  payload: PostbackSideEffectPayload
): Promise<void> {
  if (payload.isReversal) {
    // Reversals don't trigger positive side effects
    return;
  }

  const effects = [
    () => updateStreak(payload.userId),
    () => processReferralCommission(payload.userId, payload.rewardHoney, payload.providerName, payload.offerName),
    () => updateRacePoints(payload.userId, payload.rewardHoney),
    () => awardXpAndRecalcVip(payload.userId, payload.rewardHoney),
    () => checkAchievements(payload.userId),
    () => pushTickerEvent(payload),
    () => pushBalanceNotification(payload),
  ];

  // Run all side effects concurrently — each is independent
  const results = await Promise.allSettled(effects.map((fn) => fn()));

  // Log any failures for debugging (non-blocking)
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const effectNames = [
        "updateStreak",
        "processReferralCommission",
        "updateRacePoints",
        "awardXpAndRecalcVip",
        "checkAchievements",
        "pushTickerEvent",
        "pushBalanceNotification",
      ];
      postbackLogger.error(
        { err: (results[i] as PromiseRejectedResult).reason, effect: effectNames[i], userId: payload.userId },
        "Side effect failed"
      );
    }
  }
}

// ---- Individual Side Effects ----

/**
 * Update the user's daily earning streak.
 */
async function updateStreak(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastEarnDate: true, currentStreak: true, longestStreak: true },
  });
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastEarn = user.lastEarnDate
    ? new Date(user.lastEarnDate)
    : null;

  if (lastEarn) {
    lastEarn.setHours(0, 0, 0, 0);
  }

  // Already earned today — no streak update needed
  if (lastEarn && lastEarn.getTime() === today.getTime()) {
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak: number;

  if (lastEarn && lastEarn.getTime() === yesterday.getTime()) {
    // Consecutive day — increment streak
    newStreak = user.currentStreak + 1;
  } else {
    // Streak broken or first earn — start fresh
    newStreak = 1;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  await db.user.update({
    where: { id: userId },
    data: {
      lastEarnDate: new Date(),
      currentStreak: newStreak,
      longestStreak: newLongest,
    },
  });

  // Award streak bonus (every 7 days: 100 Honey, every 30 days: 500 Honey)
  let streakBonus = 0;
  let streakDescription = "";

  if (newStreak > 0 && newStreak % 30 === 0) {
    streakBonus = 500;
    streakDescription = `${newStreak}-day streak bonus!`;
  } else if (newStreak > 0 && newStreak % 7 === 0) {
    streakBonus = 100;
    streakDescription = `${newStreak}-day streak bonus!`;
  }

  if (streakBonus > 0) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        balanceHoney: { increment: streakBonus },
        lifetimeEarned: { increment: streakBonus },
      },
      select: { balanceHoney: true },
    });

    await db.transaction.create({
      data: {
        userId,
        type: "STREAK_BONUS",
        amount: streakBonus,
        balanceAfter: updated.balanceHoney,
        sourceType: "STREAK",
        description: streakDescription,
        metadata: { streakDay: newStreak },
      },
    });
  }
}

/**
 * Process referral commission if the user was referred by someone.
 */
async function processReferralCommission(
  userId: string,
  rewardHoney: number,
  providerName: string,
  offerName: string
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referredById: true, username: true },
  });

  if (!user?.referredById) return;

  const referrer = await db.user.findUnique({
    where: { id: user.referredById },
    select: { id: true, balanceHoney: true, referralTier: true, isBanned: true },
  });

  if (!referrer || referrer.isBanned) return;

  // Calculate commission based on referrer's tier
  // Tier 1 = 5%, Tier 2 = 10%, Tier 3 = 15%, Tier 4 = 20%
  const commissionRates: Record<number, number> = {
    1: 0.05,
    2: 0.10,
    3: 0.15,
    4: 0.20,
  };

  const rate = commissionRates[referrer.referralTier] ?? 0.05;
  const commission = Math.floor(rewardHoney * rate);

  if (commission <= 0) return;

  const newBalance = referrer.balanceHoney + commission;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: referrer.id },
      data: {
        balanceHoney: { increment: commission },
        lifetimeEarned: { increment: commission },
      },
    });

    await tx.transaction.create({
      data: {
        userId: referrer.id,
        type: "REFERRAL_COMMISSION",
        amount: commission,
        balanceAfter: newBalance,
        sourceType: "REFERRAL",
        description: `Referral commission from ${user.username}'s activity on ${providerName}`,
        metadata: {
          referralFromId: userId,
          offerwallName: providerName,
          offerName,
          referredUserId: userId,
          originalReward: rewardHoney,
          commissionRate: rate,
        },
      },
    });
  });
}

/**
 * Update the user's points in any active race.
 * Uses Redis ZINCRBY for the hot path (leaderboard sorted set),
 * and updates the Postgres RaceEntry for persistence.
 */
async function updateRacePoints(
  userId: string,
  rewardHoney: number
): Promise<void> {
  // Find active races
  const now = new Date();
  const activeRaces = await db.race.findMany({
    where: {
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    select: { id: true, type: true },
  });

  for (const race of activeRaces) {
    // Upsert race entry in Postgres
    await db.raceEntry.upsert({
      where: { raceId_userId: { raceId: race.id, userId } },
      create: { raceId: race.id, userId, points: rewardHoney },
      update: { points: { increment: rewardHoney } },
    });

    // Update Redis sorted set (fast leaderboard reads)
    const redisKey = `race:${race.id}:leaderboard`;
    await redis.zincrby(redisKey, rewardHoney, userId).catch(() => {});
  }
}

/**
 * Check if the user just crossed an achievement threshold.
 */
async function checkAchievements(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
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
  });

  if (!user) return;

  // Build criteria values for checking
  const criteriaValues: Record<string, number> = {
    tasks_completed: user._count.offerCompletions,
    lifetime_earned_usd: Math.floor(user.lifetimeEarned / 1000), // Honey → USD
    streak_days: user.currentStreak,
    cashouts_completed: user._count.withdrawals,
    referrals: user._count.referrals,
  };

  // Find all achievements the user hasn't earned yet
  const earnedIds = await db.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const earnedSet = new Set(earnedIds.map((a) => a.achievementId));

  const allAchievements = await db.achievement.findMany();

  for (const achievement of allAchievements) {
    if (earnedSet.has(achievement.id)) continue;

    const userValue = criteriaValues[achievement.criteriaType];
    if (userValue === undefined) continue;

    if (userValue >= achievement.criteriaValue) {
      // Award the achievement
      await db.userAchievement
        .create({
          data: { userId, achievementId: achievement.id },
        })
        .catch(() => {
          // Unique constraint violation — already awarded (race condition)
        });

      // Create notification
      await db.notification
        .create({
          data: {
            userId,
            type: "achievement_earned",
            title: `Achievement Unlocked: ${achievement.name}`,
            body: achievement.description,
            link: "/profile",
          },
        })
        .catch(() => {});
    }
  }
}

/**
 * Award XP for the earning and recalculate VIP tier.
 * 1 Honey earned = 1 XP. VIP tier is recalculated every time based on 30-day earnings.
 */
async function awardXpAndRecalcVip(
  userId: string,
  rewardHoney: number
): Promise<void> {
  // Award XP (1:1 with Honey earned)
  await awardXp(userId, rewardHoney);

  // Recalculate VIP tier based on rolling 30-day earnings
  await recalculateVipTier(userId);
}

/**
 * Push an event to the activity ticker (Redis list + pub/sub).
 */
async function pushTickerEvent(
  payload: PostbackSideEffectPayload
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { username: true, anonymousOnLeaderboard: true },
  });
  if (!user) return;

  const event = {
    type: "earning",
    username: user.anonymousOnLeaderboard
      ? `${user.username.slice(0, 2)}***`
      : user.username,
    amount: payload.rewardHoney,
    offerName: payload.offerName,
    provider: payload.providerName,
    timestamp: Date.now(),
  };

  const eventJson = JSON.stringify(event);

  // Push to Redis list (capped at 50 events)
  await redis.lpush("ticker:events", eventJson).catch(() => {});
  await redis.ltrim("ticker:events", 0, 49).catch(() => {});

  // Publish for real-time WebSocket broadcast (Socket.IO server subscribes)
  await redis.publish("ticker:new", eventJson).catch(() => {});
}

/**
 * Push a balance update notification via Redis pub/sub.
 * The Socket.IO server subscribes and delivers to the specific user's client.
 */
async function pushBalanceNotification(
  payload: PostbackSideEffectPayload
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { balanceHoney: true },
  });
  if (!user) return;

  const event = {
    userId: payload.userId,
    balanceHoney: user.balanceHoney,
    earned: payload.rewardHoney,
    offerName: payload.offerName,
    provider: payload.providerName,
  };

  await redis
    .publish(`user:${payload.userId}:balance`, JSON.stringify(event))
    .catch(() => {});

  // Also create an on-site notification and push via Socket.IO
  const notification = await db.notification
    .create({
      data: {
        userId: payload.userId,
        type: "offer_credited",
        title: `+${payload.rewardHoney} Honey`,
        body: `'${payload.offerName}' on ${payload.providerName}`,
        link: "/profile",
      },
    })
    .catch(() => null);

  // Publish notification for real-time delivery via Socket.IO
  if (notification) {
    const notifEvent = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    };

    await redis
      .publish(
        `user:${payload.userId}:notification`,
        JSON.stringify(notifEvent)
      )
      .catch(() => {});
  }
}
