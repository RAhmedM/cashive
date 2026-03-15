/**
 * User Support Ticket Detail API
 *
 * GET /api/user/me/support/[id] — Get a specific ticket (must belong to user)
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/middleware";

export const GET = withAuth(async (_request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing ticket ID", 400);

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return jsonError("Ticket not found", 404);
  if (ticket.userId !== user.id) return jsonError("Ticket not found", 404);

  return jsonOk({ ticket });
});

export const dynamic = "force-dynamic";
