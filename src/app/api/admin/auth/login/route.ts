/**
 * POST /api/admin/auth/login
 *
 * Authenticate an admin user with email, password, and optional 2FA.
 * Completely separate from user authentication.
 */
import { db } from "@/lib/db";
import {
  verifyAdminPassword,
  createAdminSession,
} from "@/lib/admin-auth";
import { decrypt2FASecret, getClientIp } from "@/lib/auth";
import { jsonOk, jsonError, parseBody, rateLimit, RATE_LIMITS } from "@/lib/middleware";
import { adminLoginSchema } from "@/lib/validations/admin";
import * as OTPAuth from "otpauth";

export async function POST(request: Request) {
  // Rate limit: 5 login attempts per minute per IP
  const rateLimited = await rateLimit(request, RATE_LIMITS.login);
  if (rateLimited) return rateLimited;

  const { data, error } = await parseBody(request, adminLoginSchema);
  if (error) return error;

  const { email, password, twoFactorCode } = data;
  const ip = getClientIp(request);

  // Find admin user
  const admin = await db.adminUser.findUnique({ where: { email } });

  if (!admin) {
    return jsonError("Invalid email or password", 401);
  }

  // Check if active
  if (!admin.isActive) {
    return jsonError("This admin account has been deactivated", 403);
  }

  // Verify password
  const passwordValid = await verifyAdminPassword(password, admin.passwordHash);
  if (!passwordValid) {
    return jsonError("Invalid email or password", 401);
  }

  // Check 2FA
  if (admin.totpEnabled && admin.totpSecret) {
    if (!twoFactorCode) {
      return jsonOk({ requires2FA: true }, 200);
    }

    try {
      const decryptedSecret = decrypt2FASecret(admin.totpSecret);
      const totp = new OTPAuth.TOTP({
        secret: decryptedSecret,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: twoFactorCode, window: 1 });
      if (delta === null) {
        return jsonError("Invalid 2FA code", 401);
      }
    } catch {
      return jsonError("2FA verification failed", 500);
    }
  }

  // Create admin session
  await createAdminSession(admin, { ip });

  return jsonOk({
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
}
