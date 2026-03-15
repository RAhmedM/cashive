/**
 * PATCH /api/admin/offers/featured/reorder — Reorder featured offers
 *
 * Admin-only endpoint. Accepts an array of featured offer IDs
 * in the desired display order and updates each offer's sortOrder.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";

export const PATCH = withAdmin(async (request, admin) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("orderedIds" in body) ||
    !Array.isArray((body as { orderedIds: unknown }).orderedIds)
  ) {
    return jsonError("Body must contain orderedIds: string[]", 400);
  }

  const { orderedIds } = body as { orderedIds: string[] };

  if (orderedIds.length === 0) {
    return jsonError("orderedIds must not be empty", 400);
  }

  // Validate all IDs are strings
  if (!orderedIds.every((id) => typeof id === "string" && id.length > 0)) {
    return jsonError("All orderedIds must be non-empty strings", 400);
  }

  // Verify all IDs exist
  const existing = await db.featuredOffer.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, sortOrder: true },
  });

  if (existing.length !== orderedIds.length) {
    return jsonError("One or more offer IDs not found", 404);
  }

  // Build the previous order map for the audit log
  const beforeOrder: Record<string, number> = {};
  for (const offer of existing) {
    beforeOrder[offer.id] = offer.sortOrder;
  }

  // Update each offer's sortOrder in a transaction
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.featuredOffer.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  // Build after-state for audit
  const afterOrder: Record<string, number> = {};
  for (let i = 0; i < orderedIds.length; i++) {
    afterOrder[orderedIds[i]] = i;
  }

  await createAuditLog({
    adminId: admin.id,
    action: "REORDER_FEATURED_OFFERS",
    targetType: "FeaturedOffer",
    beforeState: beforeOrder,
    afterState: afterOrder,
  });

  return jsonOk({ success: true });
}, "ADMIN");
