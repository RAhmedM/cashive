/**
 * POST /api/user/me/2fa/disable
 *
 * Disable 2FA. Requires the current password for security.
 */
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { withAuth, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { z } from "zod";

const disable2FASchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const POST = withAuth(async (request, user) => {
  if (!user.twoFactorEnabled) {
    return jsonError("Two-factor authentication is not enabled", 400);
  }

  const { data, error } = await parseBody(request, disable2FASchema);
  if (error) return error;

  // Verify password
  if (!user.passwordHash) {
    return jsonError("Cannot disable 2FA for social-login-only accounts", 400);
  }

  const isValid = await verifyPassword(data.password, user.passwordHash);
  if (!isValid) {
    return jsonError("Incorrect password", 401);
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    },
  });

  return jsonOk({ message: "Two-factor authentication disabled." });
});
