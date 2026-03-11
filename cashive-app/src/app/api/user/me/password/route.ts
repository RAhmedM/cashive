/**
 * PATCH /api/user/me/password
 *
 * Change the current user's password. Requires current password confirmation.
 */
import { db } from "@/lib/db";
import {
  verifyPassword,
  hashPassword,
  destroyAllSessions,
  createSession,
  getClientIp,
  getDeviceInfo,
} from "@/lib/auth";
import { withAuth, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { changePasswordSchema } from "@/lib/validations/auth";

export const PATCH = withAuth(async (request, user) => {
  const { data, error } = await parseBody(request, changePasswordSchema);
  if (error) return error;

  const { currentPassword, newPassword } = data;

  // User must have a password set (not social-only)
  if (!user.passwordHash) {
    return jsonError(
      "Cannot change password for social-login-only accounts. Set a password first.",
      400
    );
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return jsonError("Current password is incorrect", 401);
  }

  // Hash and update
  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Destroy all sessions and create a new one for the current device
  await destroyAllSessions(user.id);
  const ip = getClientIp(request);
  const device = getDeviceInfo(request);
  await createSession(user.id, { ip, device });

  return jsonOk({ message: "Password changed successfully. All other sessions have been logged out." });
});
