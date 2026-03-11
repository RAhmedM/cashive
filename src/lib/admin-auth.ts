/**
 * Admin authentication utilities.
 *
 * Completely separate from user auth. Uses the AdminUser model,
 * stores sessions in Redis with an "admin:" prefix, and uses a
 * separate HTTP-only cookie.
 */
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { redis } from "./redis";
import type { AdminUser, AdminRole, Prisma } from "@/generated/prisma";

// ---- Constants ----

const ADMIN_SESSION_COOKIE = "cashive_admin_session";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours (shorter for security)
const ADMIN_SESSION_REDIS_PREFIX = "admin:session:";
const BCRYPT_ROUNDS = 12;

// ---- Types ----

export type AdminSessionData = {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type AuthenticatedAdmin = AdminUser & { adminSessionId: string };

// ---- Password Hashing ----

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyAdminPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---- Admin Session Management ----

/**
 * Create a new admin session. Stores in Redis only (no DB session table for admins),
 * sets an HTTP-only cookie.
 */
export async function createAdminSession(
  admin: AdminUser,
  opts: { ip?: string }
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const sessionId = randomBytes(16).toString("hex");

  const sessionData: AdminSessionData = {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };

  // Store in Redis with admin: prefix
  const redisKey = `${ADMIN_SESSION_REDIS_PREFIX}${token}`;
  await redis.set(
    redisKey,
    JSON.stringify({ ...sessionData, sessionId, ip: opts.ip }),
    "PX",
    ADMIN_SESSION_TTL_MS
  );

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_MS / 1000,
  });

  // Update last login
  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return sessionId;
}

/**
 * Validate the current request's admin session. Returns the admin or null.
 */
export async function getAdminSessionUser(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const redisKey = `${ADMIN_SESSION_REDIS_PREFIX}${token}`;
  const cached = await redis.get(redisKey).catch(() => null);

  if (!cached) return null;

  const data = JSON.parse(cached) as AdminSessionData & {
    sessionId: string;
    ip?: string;
  };

  // Fetch the admin from DB to ensure they're still active
  const admin = await db.adminUser.findUnique({
    where: { id: data.adminId },
  });

  if (!admin || !admin.isActive) {
    // Admin deactivated — destroy session
    await redis.del(redisKey).catch(() => {});
    return null;
  }

  return { ...admin, adminSessionId: data.sessionId };
}

/**
 * Destroy the current admin session (logout).
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;

  const redisKey = `${ADMIN_SESSION_REDIS_PREFIX}${token}`;
  await redis.del(redisKey).catch(() => {});

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Destroy all admin sessions for a given admin (force logout everywhere).
 */
export async function destroyAllAdminSessions(adminId: string): Promise<void> {
  // Scan Redis for all admin sessions and remove those belonging to this admin
  let cursor = "0";
  do {
    const [newCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      `${ADMIN_SESSION_REDIS_PREFIX}*`,
      "COUNT",
      100
    );
    cursor = newCursor;

    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const results = await pipeline.exec();

      const delPipeline = redis.pipeline();
      results?.forEach((result, idx) => {
        if (result[1]) {
          try {
            const data = JSON.parse(result[1] as string) as AdminSessionData;
            if (data.adminId === adminId) {
              delPipeline.del(keys[idx]);
            }
          } catch {
            // Skip malformed entries
          }
        }
      });
      await delPipeline.exec().catch(() => {});
    }
  } while (cursor !== "0");
}

// ---- Audit Logging ----

/**
 * Create an audit log entry for an admin action.
 */
export async function createAuditLog(opts: {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  ip?: string;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      adminId: opts.adminId,
      action: opts.action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      beforeState: opts.beforeState ?? undefined,
      afterState: opts.afterState ?? undefined,
      ip: opts.ip ?? null,
    },
  });
}

// ---- Role Checking ----

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  SUPPORT_AGENT: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Check if an admin has at least the required role level.
 */
export function hasRole(adminRole: AdminRole, requiredRole: AdminRole): boolean {
  return ROLE_HIERARCHY[adminRole] >= ROLE_HIERARCHY[requiredRole];
}
