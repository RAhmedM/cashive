/**
 * VIP / Leveling / XP System
 *
 * XP is earned from completing offers. 1 Honey earned = 1 XP.
 * Levels use a quadratic curve: XP needed for level N = 100 * N^1.5 (rounded).
 * VIP tiers are based on monthly lifetime earnings (rolling 30-day window).
 *
 * VIP tier bonuses (applied as % bonus on offerwall earnings):
 *   NONE     = 0%
 *   BRONZE   = 2%
 *   SILVER   = 5%
 *   GOLD     = 8%
 *   PLATINUM = 12%
 */
import { db } from "@/lib/db";
import type { VipTier } from "@/generated/prisma";

// ---- VIP Tier Configuration ----

export interface VipTierConfig {
  tier: VipTier;
  name: string;
  bonusPercent: number;
  /** Monthly Honey threshold to reach this tier */
  monthlyThresholdHoney: number;
  /** Benefits list for display */
  benefits: string[];
  color: string;
}

export const VIP_TIERS: VipTierConfig[] = [
  {
    tier: "NONE",
    name: "None",
    bonusPercent: 0,
    monthlyThresholdHoney: 0,
    benefits: ["Access to all offerwalls", "Basic earning rates"],
    color: "#6B7280",
  },
  {
    tier: "BRONZE",
    name: "Bronze",
    bonusPercent: 2,
    monthlyThresholdHoney: 5_000, // $5/month
    benefits: ["+2% bonus on all earnings", "Bronze badge on profile", "Priority support"],
    color: "#CD7F32",
  },
  {
    tier: "SILVER",
    name: "Silver",
    bonusPercent: 5,
    monthlyThresholdHoney: 25_000, // $25/month
    benefits: ["+5% bonus on all earnings", "Silver badge on profile", "Priority support", "Reduced withdrawal fees"],
    color: "#C0C0C0",
  },
  {
    tier: "GOLD",
    name: "Gold",
    bonusPercent: 8,
    monthlyThresholdHoney: 100_000, // $100/month
    benefits: ["+8% bonus on all earnings", "Gold badge on profile", "Priority support", "No withdrawal fees", "Early access to new offers"],
    color: "#FFD700",
  },
  {
    tier: "PLATINUM",
    name: "Platinum",
    bonusPercent: 12,
    monthlyThresholdHoney: 500_000, // $500/month
    benefits: ["+12% bonus on all earnings", "Platinum badge on profile", "Dedicated support agent", "No withdrawal fees", "Early access to new offers", "Exclusive promotions"],
    color: "#E5E4E2",
  },
];

/**
 * Get VIP tier config by tier enum value.
 */
export function getVipTierConfig(tier: VipTier): VipTierConfig {
  return VIP_TIERS.find((t) => t.tier === tier) ?? VIP_TIERS[0];
}

/**
 * Get the bonus percent for a VIP tier.
 */
export function getVipBonusPercent(tier: VipTier): number {
  return getVipTierConfig(tier).bonusPercent;
}

// ---- Leveling System ----

/**
 * Calculate total XP required to reach a given level.
 * Uses a quadratic curve: xpForLevel(N) = 100 * N^1.5 (rounded).
 * Level 1 = 0 XP (everyone starts here).
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level, 1.5));
}

/**
 * Calculate the user's level from their total XP.
 */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/**
 * Get level progress info for display.
 */
export function getLevelProgress(xp: number): {
  level: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
} {
  const level = levelFromXp(xp);
  const xpCurrent = xpForLevel(level);
  const xpNext = xpForLevel(level + 1);
  const progressInLevel = xp - xpCurrent;
  const xpNeeded = xpNext - xpCurrent;

  return {
    level,
    currentXp: xp,
    xpForCurrentLevel: xpCurrent,
    xpForNextLevel: xpNext,
    progressPercent: xpNeeded > 0 ? Math.min(100, Math.round((progressInLevel / xpNeeded) * 100)) : 0,
  };
}

// ---- XP & Level Update ----

/**
 * Award XP to a user and update their level if it changed.
 * Returns the new level if the user leveled up, null otherwise.
 */
export async function awardXp(
  userId: string,
  xpAmount: number
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const user = await db.user.update({
    where: { id: userId },
    data: { xp: { increment: xpAmount } },
    select: { xp: true, level: true },
  });

  const calculatedLevel = levelFromXp(user.xp);

  if (calculatedLevel !== user.level) {
    await db.user.update({
      where: { id: userId },
      data: { level: calculatedLevel },
    });

    // Create a notification for level-up
    if (calculatedLevel > user.level) {
      await db.notification
        .create({
          data: {
            userId,
            type: "level_up",
            title: `Level Up! You're now Level ${calculatedLevel}`,
            body: `You've earned enough XP to reach level ${calculatedLevel}. Keep going!`,
            link: "/rewards",
          },
        })
        .catch(() => {});
    }

    return { newXp: user.xp, newLevel: calculatedLevel, leveledUp: true };
  }

  return { newXp: user.xp, newLevel: user.level, leveledUp: false };
}

// ---- VIP Tier Calculation ----

/**
 * Calculate and update a user's VIP tier based on their rolling 30-day earnings.
 * Returns the new tier if it changed, null otherwise.
 */
export async function recalculateVipTier(
  userId: string
): Promise<{ newTier: VipTier; changed: boolean }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Sum all earning transactions in the last 30 days
  const result = await db.transaction.aggregate({
    where: {
      userId,
      amount: { gt: 0 },
      type: {
        in: [
          "OFFER_EARNING",
          "SURVEY_EARNING",
          "REFERRAL_COMMISSION",
          "STREAK_BONUS",
          "RACE_PRIZE",
          "PROMO_CODE",
          "SIGNUP_BONUS",
        ],
      },
      createdAt: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  });

  const monthlyEarnings = result._sum.amount ?? 0;

  // Determine the highest tier the user qualifies for
  let newTier: VipTier = "NONE";
  for (const tierConfig of VIP_TIERS) {
    if (monthlyEarnings >= tierConfig.monthlyThresholdHoney) {
      newTier = tierConfig.tier;
    }
  }

  // Update if changed
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { vipTier: true },
  });

  if (!user) return { newTier: "NONE", changed: false };

  if (user.vipTier !== newTier) {
    await db.user.update({
      where: { id: userId },
      data: { vipTier: newTier },
    });

    // Notify on tier change
    const tierConfig = getVipTierConfig(newTier);
    const direction = VIP_TIERS.findIndex((t) => t.tier === newTier) >
      VIP_TIERS.findIndex((t) => t.tier === user.vipTier)
      ? "promoted"
      : "adjusted";

    await db.notification
      .create({
        data: {
          userId,
          type: "vip_tier_change",
          title:
            direction === "promoted"
              ? `VIP Upgrade: ${tierConfig.name}!`
              : `VIP Tier Updated: ${tierConfig.name}`,
          body:
            direction === "promoted"
              ? `Congratulations! You've been promoted to ${tierConfig.name} VIP. You now get +${tierConfig.bonusPercent}% bonus on all earnings!`
              : `Your VIP tier has been adjusted to ${tierConfig.name} based on your recent 30-day earnings.`,
          link: "/rewards",
        },
      })
      .catch(() => {});

    return { newTier, changed: true };
  }

  return { newTier, changed: false };
}

// ---- Referral Tier Calculation ----

/**
 * Recalculate a user's referral tier based on active referral count.
 * Tier thresholds: 1=0+, 2=5+, 3=15+, 4=50+
 */
export async function recalculateReferralTier(
  userId: string
): Promise<{ newTier: number; changed: boolean }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Count referrals who have earned at least 1 Honey in the last 30 days
  const activeReferrals = await db.user.count({
    where: {
      referredById: userId,
      offerCompletions: {
        some: {
          createdAt: { gte: thirtyDaysAgo },
        },
      },
    },
  });

  let newTier = 1;
  if (activeReferrals >= 50) newTier = 4;
  else if (activeReferrals >= 15) newTier = 3;
  else if (activeReferrals >= 5) newTier = 2;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referralTier: true },
  });

  if (!user) return { newTier: 1, changed: false };

  if (user.referralTier !== newTier) {
    await db.user.update({
      where: { id: userId },
      data: { referralTier: newTier },
    });
    return { newTier, changed: true };
  }

  return { newTier, changed: false };
}

// ---- Race Prize Distribution ----

/**
 * Distribute prizes for a completed race.
 * Called when a race ends (by cron job or manual admin action).
 */
export async function distributeRacePrizes(
  raceId: string
): Promise<{ winnersCount: number; totalDistributed: number }> {
  const race = await db.race.findUnique({
    where: { id: raceId },
    include: {
      entries: {
        orderBy: { points: "desc" },
      },
    },
  });

  if (!race) throw new Error(`Race ${raceId} not found`);
  if (race.isActive && race.endsAt > new Date()) {
    throw new Error("Race has not ended yet");
  }

  const prizes = race.prizes as Array<{ rank: number; amount: number }>;
  let winnersCount = 0;
  let totalDistributed = 0;

  await db.$transaction(async (tx) => {
    // Mark race as inactive
    await tx.race.update({
      where: { id: raceId },
      data: { isActive: false },
    });

    // Assign ranks and distribute prizes
    for (let i = 0; i < race.entries.length; i++) {
      const entry = race.entries[i];
      const rank = i + 1;
      const prizeInfo = prizes.find((p) => p.rank === rank);
      const prizeUsd = prizeInfo?.amount ?? 0;
      const prizeHoney = Math.round(prizeUsd * 1000); // Convert USD to Honey

      // Update rank (and prize if won)
      await tx.raceEntry.update({
        where: { id: entry.id },
        data: {
          rank,
          prize: prizeUsd > 0 ? prizeUsd : null,
        },
      });

      if (prizeHoney > 0) {
        // Credit the winner
        const updated = await tx.user.update({
          where: { id: entry.userId },
          data: {
            balanceHoney: { increment: prizeHoney },
            lifetimeEarned: { increment: prizeHoney },
          },
          select: { balanceHoney: true },
        });

        await tx.transaction.create({
          data: {
            userId: entry.userId,
            type: "RACE_PRIZE",
            amount: prizeHoney,
            balanceAfter: updated.balanceHoney,
            sourceType: "race",
            sourceId: raceId,
            description: `${race.title} — Rank #${rank} prize ($${prizeUsd.toFixed(2)})`,
            metadata: { raceId, rank, prizeUsd },
          },
        });

        // Notify winner
        await tx.notification.create({
          data: {
            userId: entry.userId,
            type: "race_ended",
            title: `You placed #${rank} in ${race.title}!`,
            body: `You won $${prizeUsd.toFixed(2)} (${prizeHoney.toLocaleString()} Honey). The prize has been added to your balance.`,
            link: "/races",
          },
        });

        winnersCount++;
        totalDistributed += prizeHoney;
      }
    }
  });

  // Clean up Redis leaderboard
  try {
    const { redis } = await import("@/lib/redis");
    await redis.del(`race:${raceId}:leaderboard`);
  } catch {
    // Non-critical
  }

  return { winnersCount, totalDistributed };
}
