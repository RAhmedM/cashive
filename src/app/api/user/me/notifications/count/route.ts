/**
 * GET /api/user/me/notifications/count — Unread notification count.
 *
 * Lightweight endpoint for notification badge display.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/middleware";

export const GET = withAuth(async (_request, user) => {
  const unreadCount = await db.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return jsonOk({ unreadCount });
});
