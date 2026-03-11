/**
 * Admin Chat Report Actions API
 *
 * PATCH - Review a report (dismiss or review + optional actions: delete message, mute user)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { z } from "zod";

const reviewReportSchema = z.object({
  action: z.enum(["review", "dismiss"]),
  deleteMessage: z.boolean().optional().default(false),
  muteUser: z.boolean().optional().default(false),
  muteDurationMinutes: z.number().int().positive().optional(),
});

export const PATCH = withAdmin(async (request, admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing report ID", 400);

  const { data, error } = await parseBody(request, reviewReportSchema);
  if (error) return error;

  const report = await db.chatReport.findUnique({
    where: { id },
    include: {
      message: {
        select: { id: true, userId: true, content: true, isDeleted: true },
      },
    },
  });

  if (!report) return jsonError("Report not found", 404);
  if (report.status !== "PENDING") return jsonError("Report already reviewed", 400);

  const newStatus = data.action === "dismiss" ? "DISMISSED" : "REVIEWED";

  // Update report status
  await db.chatReport.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  const actions: string[] = [`report_${data.action}`];

  // Delete message if requested
  if (data.deleteMessage && report.message && !report.message.isDeleted) {
    await db.chatMessage.update({
      where: { id: report.message.id },
      data: { isDeleted: true, deletedBy: admin.id },
    });
    actions.push("message_deleted");
  }

  // Mute user if requested
  if (data.muteUser && report.message) {
    const mutedUntil = data.muteDurationMinutes
      ? new Date(Date.now() + data.muteDurationMinutes * 60 * 1000)
      : null;

    await db.user.update({
      where: { id: report.message.userId },
      data: {
        chatMuted: true,
        chatMutedUntil: mutedUntil,
      },
    });
    actions.push(`user_muted${mutedUntil ? `_${data.muteDurationMinutes}m` : "_permanent"}`);
  }

  createAuditLog({
    adminId: admin.id,
    action: "chat.report.review",
    targetType: "ChatReport",
    targetId: id,
    beforeState: { status: "PENDING", messageContent: report.message?.content },
    afterState: { status: newStatus, actions },
  }).catch(() => {});

  return jsonOk({ success: true, status: newStatus, actions });
}, "MODERATOR");

export const dynamic = "force-dynamic";
