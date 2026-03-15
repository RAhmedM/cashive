/**
 * User Support Ticket Messages API
 *
 * POST /api/user/me/support/[id]/messages — Add a message to a ticket
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(5000),
});

export const POST = withAuth(async (request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing ticket ID", 400);

  const { data, error } = await parseBody(request, messageSchema);
  if (error) return error;

  const ticket = await db.supportTicket.findUnique({ where: { id } });

  if (!ticket) return jsonError("Ticket not found", 404);
  if (ticket.userId !== user.id) return jsonError("Ticket not found", 404);
  if (ticket.status === "CLOSED") return jsonError("Ticket is closed and cannot receive new messages", 400);

  const message = await db.supportMessage.create({
    data: {
      ticketId: id,
      senderId: user.id,
      isAdmin: false,
      content: data.message,
    },
  });

  // Update ticket updatedAt, and reopen if waiting on user
  const statusUpdate: Record<string, unknown> = { updatedAt: new Date() };
  if (ticket.status === "WAITING_USER") {
    statusUpdate.status = "OPEN";
  }

  await db.supportTicket.update({
    where: { id },
    data: statusUpdate,
  });

  return jsonOk({ message }, 201);
});

export const dynamic = "force-dynamic";
