/**
 * GET    /api/user/me/sessions — List active sessions
 * DELETE /api/user/me/sessions — Revoke a session by ID (via query param or body)
 */
import { db } from "@/lib/db";
import { destroySession, destroyAllSessions } from "@/lib/auth";
import { withAuth, jsonOk, jsonError, parseSearchParams } from "@/lib/middleware";

/**
 * GET — List all active sessions for the current user.
 */
export const GET = withAuth(async (_request, user) => {
  const sessions = await db.session.findMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      device: true,
      ip: true,
      lastActive: true,
      createdAt: true,
    },
    orderBy: { lastActive: "desc" },
  });

  // Mark which session is the current one
  const sessionsWithCurrent = sessions.map((s) => ({
    ...s,
    isCurrent: s.id === user.sessionId,
  }));

  return jsonOk({ sessions: sessionsWithCurrent });
});

/**
 * DELETE — Revoke a session.
 *   ?id=<sessionId>  — revoke a specific session
 *   ?all=true        — revoke all sessions except current
 */
export const DELETE = withAuth(async (request, user) => {
  const params = parseSearchParams(request);
  const sessionId = params.get("id");
  const revokeAll = params.get("all") === "true";

  if (revokeAll) {
    // Revoke all sessions except current
    const sessions = await db.session.findMany({
      where: { userId: user.id, id: { not: user.sessionId } },
    });

    for (const s of sessions) {
      await destroySession(s.id);
    }

    return jsonOk({
      message: `Revoked ${sessions.length} session(s). Current session kept active.`,
    });
  }

  if (!sessionId) {
    return jsonError("Provide ?id=<sessionId> or ?all=true", 400);
  }

  // Verify the session belongs to this user
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) {
    return jsonError("Session not found", 404);
  }

  if (session.id === user.sessionId) {
    return jsonError("Cannot revoke your current session. Use /api/auth/logout instead.", 400);
  }

  await destroySession(sessionId);

  return jsonOk({ message: "Session revoked successfully" });
});
