/**
 * Authentication utilities.
 *
 * Uses opaque session tokens (not JWT) stored in both Postgres (Session model)
 * and Redis (for fast lookup). Sessions are delivered via HTTP-only cookies.
 */
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { redis } from "./redis";
import type { User, Session } from "@/generated/prisma";

// ---- Constants ----

const SESSION_COOKIE = "cashive_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REDIS_PREFIX = "session:";
const BCRYPT_ROUNDS = 12;

// ---- Password Hashing ----

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---- Session Management (Opaque Tokens) ----

/**
 * Create a new session for a user. Stores in Postgres + Redis, sets cookie.
 */
export async function createSession(
  userId: string,
  opts: { ip?: string; device?: string }
): Promise<Session> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await db.session.create({
    data: {
      userId,
      token,
      ip: opts.ip ?? null,
      device: opts.device ?? null,
      expiresAt,
    },
  });

  // Cache in Redis for fast auth checks (store userId + minimal data)
  const redisKey = `${SESSION_REDIS_PREFIX}${token}`;
  await redis.set(
    redisKey,
    JSON.stringify({ userId, sessionId: session.id }),
    "PX",
    SESSION_TTL_MS
  );

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return session;
}

/**
 * Validate the current request's session. Returns the user or null.
 */
export async function getSessionUser(): Promise<
  (User & { sessionId: string }) | null
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Try Redis first (fast path)
  const redisKey = `${SESSION_REDIS_PREFIX}${token}`;
  const cached = await redis.get(redisKey).catch(() => null);

  if (cached) {
    const { userId, sessionId } = JSON.parse(cached) as {
      userId: string;
      sessionId: string;
    };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.isBanned) return null;

    // Touch lastActive in background (don't await)
    void db.session
      .update({
        where: { id: sessionId },
        data: { lastActive: new Date() },
      })
      .catch(() => {});

    return { ...user, sessionId };
  }

  // Fallback to Postgres (Redis miss or Redis down)
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    // Expired or not found — clear cookie
    cookieStore.delete(SESSION_COOKIE);
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  if (session.user.isBanned) return null;

  // Re-populate Redis cache
  await redis
    .set(
      redisKey,
      JSON.stringify({ userId: session.userId, sessionId: session.id }),
      "PX",
      session.expiresAt.getTime() - Date.now()
    )
    .catch(() => {});

  return { ...session.user, sessionId: session.id };
}

/**
 * Destroy a specific session (logout or revoke).
 */
export async function destroySession(sessionId: string): Promise<void> {
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) return;

  // Remove from Redis
  const redisKey = `${SESSION_REDIS_PREFIX}${session.token}`;
  await redis.del(redisKey).catch(() => {});

  // Remove from Postgres
  await db.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/**
 * Destroy the current session (logout from current device).
 */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const session = await db.session.findUnique({ where: { token } });
  if (session) {
    await destroySession(session.id);
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Destroy all sessions for a user (logout everywhere).
 */
export async function destroyAllSessions(userId: string): Promise<void> {
  const sessions = await db.session.findMany({ where: { userId } });

  // Remove all from Redis
  const pipeline = redis.pipeline();
  for (const s of sessions) {
    pipeline.del(`${SESSION_REDIS_PREFIX}${s.token}`);
  }
  await pipeline.exec().catch(() => {});

  // Remove all from Postgres
  await db.session.deleteMany({ where: { userId } });

  // Clear cookie
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ---- 2FA Encryption ----

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set (hex-encoded, 32+ bytes)");
  }
  return Buffer.from(key, "hex");
}

export function encrypt2FASecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt2FASecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, ciphertext] = encryptedSecret.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ---- Helpers ----

/**
 * Generate a cryptographically secure random token (URL-safe).
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Extract client IP from request headers (handles proxies / Vercel).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Extract a rough device description from User-Agent header.
 */
export function getDeviceInfo(request: Request): string {
  const ua = request.headers.get("user-agent") ?? "Unknown";

  // Simple extraction — production would use a UA parser library
  if (ua.includes("iPhone")) return "Safari on iPhone";
  if (ua.includes("iPad")) return "Safari on iPad";
  if (ua.includes("Android")) return "Chrome on Android";
  if (ua.includes("Mac OS")) {
    if (ua.includes("Chrome")) return "Chrome on macOS";
    if (ua.includes("Firefox")) return "Firefox on macOS";
    return "Safari on macOS";
  }
  if (ua.includes("Windows")) {
    if (ua.includes("Chrome")) return "Chrome on Windows";
    if (ua.includes("Firefox")) return "Firefox on Windows";
    if (ua.includes("Edg")) return "Edge on Windows";
    return "Browser on Windows";
  }
  if (ua.includes("Linux")) {
    if (ua.includes("Chrome")) return "Chrome on Linux";
    if (ua.includes("Firefox")) return "Firefox on Linux";
    return "Browser on Linux";
  }
  return "Unknown device";
}
