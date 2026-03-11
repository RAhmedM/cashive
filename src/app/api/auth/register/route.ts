/**
 * POST /api/auth/register
 *
 * Register a new user with email, password, and username.
 * Optionally accepts a referral code.
 */
import { db } from "@/lib/db";
import {
  hashPassword,
  createSession,
  getClientIp,
  getDeviceInfo,
} from "@/lib/auth";
import { jsonOk, jsonError, parseBody, rateLimit, RATE_LIMITS } from "@/lib/middleware";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  // Rate limit: 3 registrations per minute per IP
  const rateLimited = await rateLimit(request, RATE_LIMITS.register);
  if (rateLimited) return rateLimited;

  // Parse and validate body
  const { data, error } = await parseBody(request, registerSchema);
  if (error) return error;

  const { email, password, username, referralCode } = data;

  // Check for existing email
  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return jsonError("An account with this email already exists", 409);
  }

  // Check for existing username
  const existingUsername = await db.user.findUnique({ where: { username } });
  if (existingUsername) {
    return jsonError("This username is already taken", 409);
  }

  // Resolve referral code
  let referredById: string | null = null;
  if (referralCode) {
    const referrer = await db.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (referrer) {
      referredById = referrer.id;
    }
    // Silently ignore invalid referral codes
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Detect country from IP (placeholder — will integrate IPQualityScore later)
  const ip = getClientIp(request);

  // Create user
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      username,
      referredById,
      country: null, // will be set by IP geolocation in Phase 6
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
  });

  // Create email verification token
  const emailToken = await db.emailToken.create({
    data: {
      userId: user.id,
      type: "VERIFY_EMAIL",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  // Send verification email (non-blocking)
  void sendVerificationEmail(email, emailToken.token);

  // Create session
  const device = getDeviceInfo(request);
  await createSession(user.id, { ip, device });

  return jsonOk(
    {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        balanceHoney: user.balanceHoney,
        level: user.level,
        vipTier: user.vipTier,
        referralCode: user.referralCode,
      },
      message: "Account created. Please check your email to verify your account.",
    },
    201
  );
}
