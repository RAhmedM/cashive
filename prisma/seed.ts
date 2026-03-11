/**
 * Database seed script.
 *
 * Run with: npx tsx prisma/seed.ts
 *
 * Creates test data for local development:
 * - Test users (with hashed passwords)
 * - Offerwall providers
 * - Featured offers
 * - Achievements
 * - Active races
 * - Promo codes
 * - Admin user
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...\n");

  // ---- Admin User ----
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@cashive.gg" },
    update: {},
    create: {
      email: "admin@cashive.gg",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      name: "Admin",
    },
  });
  console.log(`  Admin: ${admin.email}`);

  // ---- Test Users ----
  const testPassword = await bcrypt.hash("Test1234!", 12);

  const user1 = await prisma.user.upsert({
    where: { email: "alice@test.com" },
    update: {},
    create: {
      email: "alice@test.com",
      emailVerified: true,
      passwordHash: testPassword,
      username: "alice",
      balanceHoney: 15000,
      lifetimeEarned: 42000,
      xp: 1250,
      level: 5,
      vipTier: "BRONZE",
      currentStreak: 3,
      longestStreak: 14,
      lastEarnDate: new Date(),
      country: "US",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "bob@test.com" },
    update: {},
    create: {
      email: "bob@test.com",
      emailVerified: true,
      passwordHash: testPassword,
      username: "bob",
      referredById: user1.id,
      balanceHoney: 5500,
      lifetimeEarned: 18000,
      xp: 420,
      level: 3,
      currentStreak: 1,
      longestStreak: 7,
      lastEarnDate: new Date(),
      country: "GB",
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "carol@test.com" },
    update: {},
    create: {
      email: "carol@test.com",
      emailVerified: true,
      passwordHash: testPassword,
      username: "carol",
      referredById: user1.id,
      balanceHoney: 87500,
      lifetimeEarned: 215000,
      xp: 8900,
      level: 15,
      vipTier: "GOLD",
      currentStreak: 28,
      longestStreak: 45,
      lastEarnDate: new Date(),
      country: "CA",
    },
  });

  console.log(`  Users: ${user1.username}, ${user2.username}, ${user3.username}`);

  // ---- Offerwall Providers ----
  const providers = [
    { slug: "torox", name: "Torox", bonusBadgePct: 0, type: "OFFERWALL" as const },
    { slug: "adgem", name: "AdGem", bonusBadgePct: 50, type: "OFFERWALL" as const },
    { slug: "lootably", name: "Lootably", bonusBadgePct: 0, type: "OFFERWALL" as const },
    { slug: "revu", name: "RevU", bonusBadgePct: 80, type: "OFFERWALL" as const },
    { slug: "adtowall", name: "AdToWall", bonusBadgePct: 0, type: "OFFERWALL" as const },
    { slug: "adscend", name: "Adscend Media", bonusBadgePct: 0, type: "SURVEY_WALL" as const },
    { slug: "ayetstudios", name: "Aye-T Studios", bonusBadgePct: 0, type: "OFFERWALL" as const },
    { slug: "monlix", name: "Monlix", bonusBadgePct: 0, type: "OFFERWALL" as const },
    { slug: "hangmyads", name: "HangMyAds", bonusBadgePct: 0, type: "OFFERWALL" as const },
    { slug: "bitlabs", name: "BitLabs", bonusBadgePct: 0, type: "SURVEY_WALL" as const },
    { slug: "cpxresearch", name: "CPX Research", bonusBadgePct: 0, type: "SURVEY_WALL" as const },
    { slug: "theoremreach", name: "TheoremReach", bonusBadgePct: 0, type: "SURVEY_WALL" as const },
    { slug: "primesurveys", name: "PrimeSurveys", bonusBadgePct: 0, type: "SURVEY_WALL" as const },
  ];

  for (const p of providers) {
    await prisma.offerwallProvider.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        postbackSecret: `dev-secret-${p.slug}`,
        postbackIps: ["127.0.0.1"],
        type: p.type,
        bonusBadgePct: p.bonusBadgePct,
        revenueSharePct: 80,
      },
    });
  }
  console.log(`  Providers: ${providers.length} offerwall providers`);

  // ---- Featured Offers ----
  const featuredOffers = [
    {
      title: "Rise of Kingdoms",
      requirement: "Reach City Hall Level 15",
      providerName: "TyrAds",
      rewardHoney: 35000,
      category: "Game",
      completions: 1247,
    },
    {
      title: "Coin Master",
      requirement: "Complete village 5",
      providerName: "AdGem",
      rewardHoney: 8500,
      category: "Game",
      completions: 3892,
    },
    {
      title: "Cash App",
      requirement: "Sign up & send $5",
      providerName: "Torox",
      rewardHoney: 12000,
      category: "App",
      completions: 5621,
    },
    {
      title: "Raid Shadow Legends",
      requirement: "Reach player level 25",
      providerName: "Lootably",
      rewardHoney: 22000,
      category: "Game",
      completions: 892,
    },
    {
      title: "Temu",
      requirement: "Make first purchase ($10+)",
      providerName: "RevU",
      rewardHoney: 15000,
      category: "Shopping",
      completions: 7234,
    },
  ];

  for (let i = 0; i < featuredOffers.length; i++) {
    const o = featuredOffers[i];
    // Use upsert on a unique constraint. Since FeaturedOffer doesn't have a natural key,
    // we'll check by title. In production, use proper IDs.
    const existing = await prisma.featuredOffer.findFirst({
      where: { title: o.title },
    });
    if (!existing) {
      await prisma.featuredOffer.create({
        data: { ...o, sortOrder: i, isActive: true },
      });
    }
  }
  console.log(`  Featured offers: ${featuredOffers.length}`);

  // ---- Achievements ----
  const achievements = [
    { slug: "first_task", name: "First Task", description: "Complete your first task on Cashive", icon: "zap", color: "#F5A623", criteriaType: "tasks_completed", criteriaValue: 1 },
    { slug: "10_tasks", name: "Getting Started", description: "Complete 10 tasks", icon: "flame", color: "#E8852D", criteriaType: "tasks_completed", criteriaValue: 10 },
    { slug: "50_tasks", name: "Dedicated Worker", description: "Complete 50 tasks", icon: "trophy", color: "#FFBE42", criteriaType: "tasks_completed", criteriaValue: 50 },
    { slug: "100_tasks", name: "Task Master", description: "Complete 100 tasks", icon: "crown", color: "#F5A623", criteriaType: "tasks_completed", criteriaValue: 100 },
    { slug: "500_tasks", name: "Legendary", description: "Complete 500 tasks", icon: "star", color: "#FFD700", criteriaType: "tasks_completed", criteriaValue: 500 },
    { slug: "first_cashout", name: "First Cashout", description: "Complete your first withdrawal", icon: "wallet", color: "#4CAF50", criteriaType: "cashouts_completed", criteriaValue: 1 },
    { slug: "earned_10", name: "$10 Club", description: "Earn a lifetime total of $10", icon: "dollar-sign", color: "#4CAF50", criteriaType: "lifetime_earned_usd", criteriaValue: 10 },
    { slug: "earned_100", name: "$100 Club", description: "Earn a lifetime total of $100", icon: "gem", color: "#2196F3", criteriaType: "lifetime_earned_usd", criteriaValue: 100 },
    { slug: "earned_1000", name: "$1,000 Club", description: "Earn a lifetime total of $1,000", icon: "diamond", color: "#9C27B0", criteriaType: "lifetime_earned_usd", criteriaValue: 1000 },
    { slug: "streak_7", name: "Week Warrior", description: "Maintain a 7-day earning streak", icon: "flame", color: "#FF5722", criteriaType: "streak_days", criteriaValue: 7 },
    { slug: "streak_30", name: "Monthly Streak", description: "Maintain a 30-day earning streak", icon: "fire", color: "#FF5722", criteriaType: "streak_days", criteriaValue: 30 },
    { slug: "first_referral", name: "Recruiter", description: "Refer your first friend", icon: "users", color: "#00BCD4", criteriaType: "referrals", criteriaValue: 1 },
    { slug: "10_referrals", name: "Influencer", description: "Refer 10 friends", icon: "share-2", color: "#00BCD4", criteriaType: "referrals", criteriaValue: 10 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      update: {},
      create: a,
    });
  }
  console.log(`  Achievements: ${achievements.length}`);

  // ---- Active Races ----
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Daily race
  const existingDailyRace = await prisma.race.findFirst({
    where: { type: "DAILY", status: "ACTIVE" },
  });
  if (!existingDailyRace) {
    const dailyRace = await prisma.race.create({
      data: {
        type: "DAILY",
        title: "$50 Daily Race",
        prizePoolUsdCents: 5000,
        prizeDistribution: [
          { rank: 1, amount: 10 },
          { rank: 2, amount: 7 },
          { rank: 3, amount: 5 },
          { rank: 4, amount: 4 },
          { rank: 5, amount: 3 },
          { rank: 6, amount: 3 },
          { rank: 7, amount: 3 },
          { rank: 8, amount: 3 },
          { rank: 9, amount: 3 },
          { rank: 10, amount: 2 },
          // Remaining $7 split among 11-25
        ],
        startsAt: todayStart,
        endsAt: todayEnd,
        status: "ACTIVE",
      },
    });

    // Add race entries for test users
    await prisma.raceEntry.createMany({
      data: [
        { raceId: dailyRace.id, userId: user1.id, points: 8500 },
        { raceId: dailyRace.id, userId: user2.id, points: 3200 },
        { raceId: dailyRace.id, userId: user3.id, points: 12800 },
      ],
    });
  }

  // Monthly race
  const existingMonthlyRace = await prisma.race.findFirst({
    where: { type: "MONTHLY", status: "ACTIVE" },
  });
  if (!existingMonthlyRace) {
    const monthlyRace = await prisma.race.create({
      data: {
        type: "MONTHLY",
        title: "$500 Monthly Race",
        prizePoolUsdCents: 50000,
        prizeDistribution: [
          { rank: 1, amount: 100 },
          { rank: 2, amount: 75 },
          { rank: 3, amount: 50 },
          { rank: 4, amount: 40 },
          { rank: 5, amount: 30 },
        ],
        startsAt: monthStart,
        endsAt: monthEnd,
        status: "ACTIVE",
      },
    });

    await prisma.raceEntry.createMany({
      data: [
        { raceId: monthlyRace.id, userId: user1.id, points: 42000 },
        { raceId: monthlyRace.id, userId: user2.id, points: 18000 },
        { raceId: monthlyRace.id, userId: user3.id, points: 215000 },
      ],
    });
  }
  console.log("  Races: daily + monthly");

  // ---- Promo Codes ----
  const promoCodes = [
    { code: "WELCOME500", rewardHoney: 500, maxUses: null },
    { code: "SUMMER2026", rewardHoney: 1000, maxUses: 100 },
    { code: "TESTCODE", rewardHoney: 250, maxUses: null },
  ];

  for (const pc of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: pc.code },
      update: {},
      create: {
        code: pc.code,
        rewardHoney: pc.rewardHoney,
        maxUses: pc.maxUses,
        isActive: true,
      },
    });
  }
  console.log(`  Promo codes: ${promoCodes.length}`);

  // ---- Sample Transactions for user1 ----
  const existingTxCount = await prisma.transaction.count({
    where: { userId: user1.id },
  });
  if (existingTxCount === 0) {
    const transactions = [
      {
        userId: user1.id,
        type: "SIGNUP_BONUS" as const,
        amount: 500,
        balanceAfter: 500,
        description: "Welcome bonus",
        sourceType: "SIGNUP" as const,
      },
      {
        userId: user1.id,
        type: "OFFER_EARNING" as const,
        amount: 8500,
        balanceAfter: 9000,
        description: "Completed 'Rise of Kingdoms' on Torox",
        sourceType: "OFFER" as const,
        metadata: { offerwallName: "Torox", offerName: "Rise of Kingdoms" },
      },
      {
        userId: user1.id,
        type: "OFFER_EARNING" as const,
        amount: 3500,
        balanceAfter: 12500,
        description: "Completed 'Coin Master' on AdGem",
        sourceType: "OFFER" as const,
        metadata: { offerwallName: "AdGem", offerName: "Coin Master" },
      },
      {
        userId: user1.id,
        type: "REFERRAL_COMMISSION" as const,
        amount: 250,
        balanceAfter: 12750,
        description: "Referral commission from bob",
        sourceType: "REFERRAL" as const,
        metadata: { referralFromId: user2.id },
      },
      {
        userId: user1.id,
        type: "STREAK_BONUS" as const,
        amount: 100,
        balanceAfter: 12850,
        description: "Day 3 streak bonus",
        sourceType: "STREAK" as const,
      },
      {
        userId: user1.id,
        type: "SURVEY_EARNING" as const,
        amount: 2150,
        balanceAfter: 15000,
        description: "Completed survey on BitLabs",
        sourceType: "OFFER" as const,
        metadata: { offerwallName: "BitLabs", offerName: "Consumer Preferences Survey" },
      },
    ];

    await prisma.transaction.createMany({ data: transactions });
    console.log(`  Transactions: ${transactions.length} for ${user1.username}`);
  }

  // ---- Sample Achievements for users ----
  const firstTaskAchievement = await prisma.achievement.findUnique({
    where: { slug: "first_task" },
  });
  const tenTasksAchievement = await prisma.achievement.findUnique({
    where: { slug: "10_tasks" },
  });

  if (firstTaskAchievement) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: user1.id,
          achievementId: firstTaskAchievement.id,
        },
      },
      update: {},
      create: {
        userId: user1.id,
        achievementId: firstTaskAchievement.id,
      },
    });

    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: user3.id,
          achievementId: firstTaskAchievement.id,
        },
      },
      update: {},
      create: {
        userId: user3.id,
        achievementId: firstTaskAchievement.id,
      },
    });
  }

  if (tenTasksAchievement) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: user3.id,
          achievementId: tenTasksAchievement.id,
        },
      },
      update: {},
      create: {
        userId: user3.id,
        achievementId: tenTasksAchievement.id,
      },
    });
  }
  console.log("  Achievements awarded to test users");

  console.log("\nSeed complete!");
  console.log("\nTest credentials:");
  console.log("  alice@test.com / Test1234!");
  console.log("  bob@test.com   / Test1234!");
  console.log("  carol@test.com / Test1234!");
  console.log("  Admin: admin@cashive.gg / Admin123!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
