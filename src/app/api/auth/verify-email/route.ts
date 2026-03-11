/**
 * POST /api/auth/verify-email
 *
 * Verify a user's email address using the token sent during registration.
 */
import { db } from "@/lib/db";
import { jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { verifyEmailSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, verifyEmailSchema);
  if (error) return error;

  const { token } = data;

  // Find the token
  const verificationToken = await db.emailToken.findUnique({
    where: { token, type: "VERIFY_EMAIL" },
  });

  if (!verificationToken) {
    return jsonError("Invalid or expired verification token", 400);
  }

  if (verificationToken.expiresAt < new Date()) {
    // Clean up expired token
    await db.emailToken.delete({ where: { id: verificationToken.id } });
    return jsonError("Verification token has expired. Please request a new one.", 400);
  }

  // Mark email as verified
  await db.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: true },
  });

  // Delete the used token
  await db.emailToken.delete({ where: { id: verificationToken.id } });

  // Also clean up any other verification tokens for this user
  await db.emailToken.deleteMany({
    where: { userId: verificationToken.userId, type: "VERIFY_EMAIL" },
  });

  return jsonOk({ message: "Email verified successfully" });
}
