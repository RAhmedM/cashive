/**
 * User Support Tickets API
 *
 * GET  /api/user/me/support — List the authenticated user's tickets (paginated)
 * POST /api/user/me/support — Create a new support ticket with initial message
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError, parseBody, parseSearchParams } from "@/lib/middleware";
import { z } from "zod";

const createTicketSchema = z.object({
  category: z.enum(
    ["WITHDRAWAL", "OFFER_NOT_CREDITED", "ACCOUNT", "KYC", "OTHER"],
    { error: "Invalid ticket category" }
  ),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().min(5, "Message must be at least 5 characters").max(5000),
});

/**
 * GET — List user's own support tickets, paginated.
 */
export const GET = withAuth(async (request, user) => {
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const where = { userId: user.id };

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    db.supportTicket.count({ where }),
  ]);

  return jsonOk({ tickets, total, page, limit });
});

/**
 * POST — Create a new support ticket with an initial message.
 */
export const POST = withAuth(async (request, user) => {
  const { data, error } = await parseBody(request, createTicketSchema);
  if (error) return error;

  const result = await db.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        userId: user.id,
        subject: data.subject,
        category: data.category,
        status: "OPEN",
        priority: "NORMAL",
      },
    });

    await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        isAdmin: false,
        content: data.message,
      },
    });

    return ticket;
  });

  return jsonOk(
    {
      ticket: {
        id: result.id,
        subject: result.subject,
        category: result.category,
        status: result.status,
        createdAt: result.createdAt,
      },
    },
    201
  );
});

export const dynamic = "force-dynamic";
