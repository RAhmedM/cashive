/**
 * Redis client singleton.
 *
 * Used for: session caching, rate limiting, leaderboard sorted sets,
 * activity ticker queue, chat message buffer, pub/sub bridge to
 * the WebSocket server.
 */
import Redis from "ioredis";
import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    // In development without Redis, return a client that will fail gracefully
    logger.warn("REDIS_URL not set — Redis features will be unavailable");
    return new Redis({ lazyConnect: true, maxRetriesPerRequest: 0 });
  }

  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ---- Rate Limiting Helpers ----

/**
 * Sliding-window rate limiter.
 * Returns { allowed: boolean, remaining: number, resetMs: number }
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipe = redis.pipeline();
  // Remove entries outside the window
  pipe.zremrangebyscore(key, 0, windowStart);
  // Count current entries
  pipe.zcard(key);
  // Add current request
  pipe.zadd(key, now, `${now}-${Math.random()}`);
  // Set expiry on the key
  pipe.pexpire(key, windowMs);

  const results = await pipe.exec();
  if (!results) {
    return { allowed: true, remaining: limit, resetMs: windowMs };
  }

  const count = (results[1]?.[1] as number) ?? 0;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count - 1);

  return { allowed, remaining, resetMs: windowMs };
}
