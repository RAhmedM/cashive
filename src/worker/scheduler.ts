/**
 * BullMQ Repeatable Job Scheduler
 *
 * Run once on deploy to register (or update) repeatable cron jobs.
 * Usage: tsx src/worker/scheduler.ts
 *
 * Schedules:
 *   - streak-check    — daily at 00:05 UTC
 *   - vip-recalc      — daily at 01:00 UTC
 *   - race-finalize   — every 5 minutes
 *   - session-cleanup — daily at 03:00 UTC
 */
import "dotenv/config";

import {
  streakCheckQueue,
  vipRecalcQueue,
  raceFinalizeQueue,
  sessionCleanupQueue,
  allQueues,
} from "@/lib/queue";

async function scheduleJobs(): Promise<void> {
  console.log("[Scheduler] Registering repeatable jobs...");

  // streak-check: daily at 00:05 UTC
  await streakCheckQueue.upsertJobScheduler(
    "streak-check-daily",
    { pattern: "5 0 * * *" },
    {
      name: "streak-check",
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    }
  );
  console.log("[Scheduler] streak-check — cron: 5 0 * * * (00:05 UTC daily)");

  // vip-recalc: daily at 01:00 UTC
  await vipRecalcQueue.upsertJobScheduler(
    "vip-recalc-daily",
    { pattern: "0 1 * * *" },
    {
      name: "vip-recalc",
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    }
  );
  console.log("[Scheduler] vip-recalc — cron: 0 1 * * * (01:00 UTC daily)");

  // race-finalize: every 5 minutes
  await raceFinalizeQueue.upsertJobScheduler(
    "race-finalize-interval",
    { every: 300000 },
    {
      name: "race-finalize",
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
      },
    }
  );
  console.log("[Scheduler] race-finalize — every 300000ms (5 minutes)");

  // session-cleanup: daily at 03:00 UTC
  await sessionCleanupQueue.upsertJobScheduler(
    "session-cleanup-daily",
    { pattern: "0 3 * * *" },
    {
      name: "session-cleanup",
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    }
  );
  console.log("[Scheduler] session-cleanup — cron: 0 3 * * * (03:00 UTC daily)");

  console.log("[Scheduler] All repeatable jobs registered successfully");

  // Close queue connections
  await Promise.all(allQueues.map((q) => q.close()));
  process.exit(0);
}

scheduleJobs().catch((err) => {
  console.error("[Scheduler] Failed to register jobs:", err);
  process.exit(1);
});
