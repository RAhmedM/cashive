/**
 * BullMQ Worker Process
 *
 * Standalone Node.js process that processes background jobs.
 * Run via PM2 or directly with: tsx src/worker/index.ts
 *
 * Queues handled:
 *   - streak-check    — reset streaks for users who didn't earn today
 *   - vip-recalc      — recalculate VIP tiers based on 60-day window
 *   - race-finalize   — finalize ended races and distribute prizes
 *   - session-cleanup — purge expired sessions from DB + Redis
 */
import "dotenv/config";
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.SENTRY_DSN,
});
import { workerLogger } from "../lib/logger";

import { Worker, type Job } from "bullmq";
import { redisConnection } from "@/lib/queue";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { recalculateVipTier, distributeRacePrizes } from "@/lib/engagement";

// ---- Job Handlers ----

async function handleStreakCheck(_job: Job): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Find users whose lastEarnDate is before today AND have an active streak
  const result = await db.user.updateMany({
    where: {
      currentStreak: { gt: 0 },
      lastEarnDate: { lt: startOfToday },
    },
    data: {
      currentStreak: 0,
    },
  });

  workerLogger.info({ count: result.count }, "streak-check: reset streaks");
}

async function handleVipRecalc(_job: Job): Promise<void> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  // Find all users who have earning transactions in the last 60 days
  const usersWithEarnings = await db.transaction.findMany({
    where: {
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
      createdAt: { gte: sixtyDaysAgo },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  let changed = 0;

  for (const { userId } of usersWithEarnings) {
    try {
      const result = await recalculateVipTier(userId);
      if (result.changed) changed++;
    } catch (err) {
      workerLogger.error({ err, userId }, "vip-recalc: error recalculating tier");
    }
  }

  workerLogger.info(
    { usersProcessed: usersWithEarnings.length, tierChanges: changed },
    "vip-recalc: completed"
  );
}

async function handleRaceFinalize(_job: Job): Promise<void> {
  const now = new Date();

  // Find all races that are active and have ended
  const endedRaces = await db.race.findMany({
    where: {
      status: "ACTIVE",
      endsAt: { lte: now },
    },
    select: { id: true, title: true },
  });

  if (endedRaces.length === 0) {
    workerLogger.info("race-finalize: no races to finalize");
    return;
  }

  for (const race of endedRaces) {
    try {
      const result = await distributeRacePrizes(race.id);
      workerLogger.info(
        { raceId: race.id, title: race.title, winnersCount: result.winnersCount, totalDistributed: result.totalDistributed },
        "race-finalize: finalized race"
      );
    } catch (err) {
      workerLogger.error({ err, raceId: race.id, title: race.title }, "race-finalize: error finalizing race");
    }
  }

  workerLogger.info({ count: endedRaces.length }, "race-finalize: processed races");
}

async function handleSessionCleanup(_job: Job): Promise<void> {
  const now = new Date();

  // Find expired sessions (need tokens for Redis cleanup)
  const expiredSessions = await db.session.findMany({
    where: {
      expiresAt: { lt: now },
    },
    select: { id: true, token: true },
  });

  if (expiredSessions.length === 0) {
    workerLogger.info("session-cleanup: no expired sessions");
    return;
  }

  // Delete from database
  await db.session.deleteMany({
    where: {
      id: { in: expiredSessions.map((s) => s.id) },
    },
  });

  // Delete corresponding Redis keys
  const redisPipeline = redis.pipeline();
  for (const session of expiredSessions) {
    redisPipeline.del(`session:${session.token}`);
  }

  try {
    await redisPipeline.exec();
  } catch (err) {
    workerLogger.error({ err }, "session-cleanup: error cleaning Redis session keys");
  }

  workerLogger.info({ count: expiredSessions.length }, "session-cleanup: cleaned expired sessions");
}

// ---- Workers ----

const workers: Worker[] = [];

function createWorkers(): void {
  const streakWorker = new Worker(
    "streak-check",
    async (job) => {
      try {
        await handleStreakCheck(job);
      } catch (err) {
        workerLogger.error({ err }, "streak-check: job failed");
        Sentry.captureException(err);
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 1 }
  );

  const vipWorker = new Worker(
    "vip-recalc",
    async (job) => {
      try {
        await handleVipRecalc(job);
      } catch (err) {
        workerLogger.error({ err }, "vip-recalc: job failed");
        Sentry.captureException(err);
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 1 }
  );

  const raceWorker = new Worker(
    "race-finalize",
    async (job) => {
      try {
        await handleRaceFinalize(job);
      } catch (err) {
        workerLogger.error({ err }, "race-finalize: job failed");
        Sentry.captureException(err);
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 1 }
  );

  const sessionWorker = new Worker(
    "session-cleanup",
    async (job) => {
      try {
        await handleSessionCleanup(job);
      } catch (err) {
        workerLogger.error({ err }, "session-cleanup: job failed");
        Sentry.captureException(err);
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 1 }
  );

  workers.push(streakWorker, vipWorker, raceWorker, sessionWorker);

  // Log worker events
  for (const worker of workers) {
    worker.on("completed", (job) => {
      workerLogger.info({ queue: worker.name, jobId: job.id }, "Job completed");
    });

    worker.on("failed", (job, err) => {
      workerLogger.error({ queue: worker.name, jobId: job?.id, err }, "Job failed");
    });

    worker.on("error", (err) => {
      workerLogger.error({ queue: worker.name, err }, "Worker error");
    });
  }
}

// ---- Graceful Shutdown ----

async function shutdown(signal: string): Promise<void> {
  workerLogger.info({ signal }, "Received signal, shutting down gracefully...");

  await Promise.all(workers.map((w) => w.close()));
  workerLogger.info("All workers closed");

  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---- Start ----

workerLogger.info("Starting BullMQ workers...");
createWorkers();
workerLogger.info("Workers ready — listening for jobs on queues: streak-check, vip-recalc, race-finalize, session-cleanup");
