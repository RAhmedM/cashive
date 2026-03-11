/**
 * GET    /api/admin/offers/featured/[id]  — Get featured offer details
 * PATCH  /api/admin/offers/featured/[id]  — Update a featured offer
 * DELETE /api/admin/offers/featured/[id]  — Delete a featured offer
 *
 * Admin-only endpoints for managing individual featured offers.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { updateFeaturedOfferSchema } from "@/lib/validations/offers";

/**
 * GET — Get a single featured offer by ID.
 */
export const GET = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Offer ID is required", 400);

  const offer = await db.featuredOffer.findUnique({ where: { id } });
  if (!offer) {
    return jsonError("Featured offer not found", 404);
  }

  return jsonOk({ offer });
});

/**
 * PATCH — Update a featured offer.
 */
export const PATCH = withAdmin(async (request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Offer ID is required", 400);

  const existing = await db.featuredOffer.findUnique({ where: { id } });
  if (!existing) {
    return jsonError("Featured offer not found", 404);
  }

  const { data, error } = await parseBody(request, updateFeaturedOfferSchema);
  if (error) return error;

  const offer = await db.featuredOffer.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.requirement !== undefined && { requirement: data.requirement }),
      ...(data.providerName !== undefined && { providerName: data.providerName }),
      ...(data.providerLogoUrl !== undefined && {
        providerLogoUrl: data.providerLogoUrl || null,
      }),
      ...(data.posterImageUrl !== undefined && {
        posterImageUrl: data.posterImageUrl || null,
      }),
      ...(data.appIconUrl !== undefined && {
        appIconUrl: data.appIconUrl || null,
      }),
      ...(data.rewardHoney !== undefined && { rewardHoney: data.rewardHoney }),
      ...(data.externalUrl !== undefined && {
        externalUrl: data.externalUrl || null,
      }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.completions !== undefined && { completions: data.completions }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return jsonOk({ offer });
});

/**
 * DELETE — Delete a featured offer.
 */
export const DELETE = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Offer ID is required", 400);

  const offer = await db.featuredOffer.findUnique({ where: { id } });
  if (!offer) {
    return jsonError("Featured offer not found", 404);
  }

  await db.featuredOffer.delete({ where: { id } });

  return jsonOk({ deleted: true });
});
