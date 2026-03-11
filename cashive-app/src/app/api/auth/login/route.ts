/**
 * POST /api/auth/login
 *
 * Authenticate with email and password. Supports 2FA verification.
 */
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  decrypt2FASecret,
  getClientIp,
  getDeviceInfo,
} from "@/lib/auth";
import { jsonOk, jsonError, parseBody, rateLimit, RATE_LIMITS } from "@/lib/middleware";
import { loginSchema } from "@/lib/validations/auth";
import * as OTPAuth from "otpauth";

export async function POST(request: Request) {
  // Rate limit: 5 login attempts per minute per IP
  const rateLimited = await rateLimit(request, RATE_LIMITS.login);
  if (rateLimited) return rateLimited;

  const { data, error } = await parseBody(request, loginSchema);
  if (error) return error;

  const { email, password, twoFactorCode } = data;
  const ip = getClientIp(request);

  // Find user
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    // Log failed attempt
    await db.loginAttempt.create({
      data: {
        userId: user?.id,
        email,
        ip,
        success: false,
        failReason: "invalid_credentials",
      },
    });
    return jsonError("Invalid email or password", 401);
  }

  // Check if banned
  if (user.isBanned) {
    await db.loginAttempt.create({
      data: {
        userId: user.id,
        email,
        ip,
        success: false,
        failReason: "account_banned",
      },
    });
    return jsonError("This account has been suspended", 403);
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    await db.loginAttempt.create({
      data: {
        userId: user.id,
        email,
        ip,
        success: false,
        failReason: "invalid_password",
      },
    });
    return jsonError("Invalid email or password", 401);
  }

  // Check 2FA
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!twoFactorCode) {
      // User needs to provide 2FA code
      return jsonOk({ requires2FA: true }, 200);
    }

    // Verify TOTP code
    try {
      const decryptedSecret = decrypt2FASecret(user.twoFactorSecret);
      const totp = new OTPAuth.TOTP({
        secret: decryptedSecret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: twoFactorCode, window: 1 });
      if (delta === null) {
        await db.loginAttempt.create({
          data: {
            userId: user.id,
            email,
            ip,
            success: false,
            failReason: "2fa_failed",
          },
        });
        return jsonError("Invalid 2FA code", 401);
      }
    } catch {
      return jsonError("2FA verification failed", 500);
    }
  }

  // Log successful login
  await db.loginAttempt.create({
    data: { userId: user.id, email, ip, success: true },
  });

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  // Create session
  const device = getDeviceInfo(request);
  await createSession(user.id, { ip, device });

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      balanceHoney: user.balanceHoney,
      lifetimeEarned: user.lifetimeEarned,
      level: user.level,
      vipTier: user.vipTier,
      currentStreak: user.currentStreak,
      referralCode: user.referralCode,
    },
  });
}
