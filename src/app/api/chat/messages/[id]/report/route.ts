/**
 * POST /api/chat/messages/[id]/report — Report a chat message.
 *
 * Authenticated users can report messages for moderation review.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError, rateLimit } from "@/lib/middleware";

const REPORT_RATE_LIMIT = {
  limit: 5,
  windowMs: 300_000, // 5 reports per 5 minutes
  prefix: "chat-report",
  keyBy: "user" as const,
};

export const POST = withAuth(async (request, user, params) => {
  const messageId = params?.id;
  if (!messageId) {
    return jsonError("Message ID is required", 400);
  }

  // Rate limit
  const rateLimited = await rateLimit(request, REPORT_RATE_LIMIT, user.id);
  if (rateLimited) return rateLimited;

  let body: { reason?: string; detail?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const reason = body.reason?.trim();
  const validReasons = ["SPAM", "HARASSMENT", "INAPPROPRIATE", "ADVERTISING", "OTHER"];

  if (!reason || !validReasons.includes(reason)) {
    return jsonError(
      `Invalid reason. Must be one of: ${validReasons.join(", ")}`,
      400
    );
  }

  // Verify the message exists and isn't deleted
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, isDeleted: true },
  });

  if (!message || message.isDeleted) {
    return jsonError("Message not found", 404);
  }

  // Can't report your own messages
  if (message.userId === user.id) {
    return jsonError("You cannot report your own message", 400);
  }

  // Check for duplicate report
  const existingReport = await db.chatReport.findFirst({
    where: {
      messageId,
      reportedBy: user.id,
    },
  });

  if (existingReport) {
    return jsonError("You have already reported this message", 409);
  }

  // Create the report
  const report = await db.chatReport.create({
    data: {
      messageId,
      reportedBy: user.id,
      reason: reason as any,
      detail: body.detail?.trim()?.slice(0, 500) || null,
    },
  });

  return jsonOk({ reportId: report.id }, 201);
});

export const dynamic = "force-dynamic";
