/**
 * BullMQ queue configuration.
 *
 * Shared module that exports queue instances for background job processing.
 * Queues:
 *   - streak-check    — daily streak reset for inactive users
 *   - vip-recalc      — daily VIP tier recalculation
 *   - race-finalize   — finalize races that have ended
 *   - session-cleanup — purge expired sessions from DB + Redis
 */
import { Queue, type ConnectionOptions } from "bullmq";

// ---- Connection ----

function parseRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[Queue] REDIS_URL not set — using localhost defaults");
    return { host: "127.0.0.1", port: 6379 };
  }

  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

export const redisConnection: ConnectionOptions = parseRedisConnection();

// ---- Queues ----

export const streakCheckQueue = new Queue("streak-check", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const vipRecalcQueue = new Queue("vip-recalc", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const raceFinalizeQueue = new Queue("race-finalize", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

export const sessionCleanupQueue = new Queue("session-cleanup", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

// ---- Helper ----

/** All queues for bulk operations (e.g. closing connections on shutdown). */
export const allQueues = [
  streakCheckQueue,
  vipRecalcQueue,
  raceFinalizeQueue,
  sessionCleanupQueue,
];
