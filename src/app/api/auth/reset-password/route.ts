/**
 * POST /api/auth/reset-password
 *
 * Reset a user's password using a valid reset token.
 */
import { db } from "@/lib/db";
import { hashPassword, destroyAllSessions } from "@/lib/auth";
import { jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, resetPasswordSchema);
  if (error) return error;

  const { token, password } = data;

  // Find the reset token
  const resetToken = await db.emailToken.findUnique({
    where: { token, type: "RESET_PASSWORD" },
  });

  if (!resetToken || resetToken.used) {
    return jsonError("Invalid or already used reset token", 400);
  }

  if (resetToken.expiresAt < new Date()) {
    return jsonError("Reset token has expired. Please request a new one.", 400);
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update password and mark token as used in a transaction
  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    db.emailToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
  ]);

  // Destroy all existing sessions (force re-login with new password)
  await destroyAllSessions(resetToken.userId);

  return jsonOk({ message: "Password reset successfully. Please log in with your new password." });
}
