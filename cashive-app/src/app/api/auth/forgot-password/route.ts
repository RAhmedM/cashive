/**
 * POST /api/auth/forgot-password
 *
 * Send a password reset email. Always returns 200 to prevent email enumeration.
 */
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { jsonOk, parseBody, rateLimit, RATE_LIMITS } from "@/lib/middleware";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  // Rate limit: 3 per 5 minutes per IP
  const rateLimited = await rateLimit(request, RATE_LIMITS.forgotPassword);
  if (rateLimited) return rateLimited;

  const { data, error } = await parseBody(request, forgotPasswordSchema);
  if (error) return error;

  const { email } = data;

  // Always return success to prevent email enumeration
  const successResponse = jsonOk({
    message: "If an account with that email exists, a password reset link has been sent.",
  });

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    return successResponse;
  }

  // Invalidate any existing reset tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Create new reset token (expires in 1 hour)
  const token = generateToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // Send email (non-blocking)
  void sendPasswordResetEmail(user.email, token);

  return successResponse;
}
