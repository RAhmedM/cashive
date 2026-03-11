/**
 * GET   /api/user/me/notifications — Paginated notifications
 * PATCH /api/user/me/notifications — Mark notifications as read
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError, parseSearchParams } from "@/lib/middleware";

/**
 * GET — Paginated list of notifications.
 *   ?page=1&limit=20&unread=true
 */
export const GET = withAuth(async (request, user) => {
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));
  const unreadOnly = params.get("unread") === "true";
  const skip = (page - 1) * limit;

  const where = {
    userId: user.id,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return jsonOk({
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * PATCH — Mark notifications as read.
 *   Body: { ids: string[] } or { all: true }
 */
export const PATCH = withAuth(async (request, user) => {
  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (body.all) {
    const result = await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return jsonOk({ message: `Marked ${result.count} notification(s) as read` });
  }

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return jsonError("Provide { ids: string[] } or { all: true }", 400);
  }

  // Only mark notifications that belong to this user
  const result = await db.notification.updateMany({
    where: {
      id: { in: body.ids },
      userId: user.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  return jsonOk({ message: `Marked ${result.count} notification(s) as read` });
});
