/**
 * GET  /api/admin/offers/featured  — List all featured offers
 * POST /api/admin/offers/featured  — Create a new featured offer
 *
 * Admin-only endpoints for managing curated featured offers
 * that appear on the Earn page.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, parseBody } from "@/lib/middleware";
import { createFeaturedOfferSchema } from "@/lib/validations/offers";

/**
 * GET — List all featured offers (including inactive ones for admin).
 */
export const GET = withAdmin(async (request) => {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "true";

  const offers = await db.featuredOffer.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return jsonOk({ offers });
});

/**
 * POST — Create a new featured offer.
 */
export const POST = withAdmin(async (request) => {
  const { data, error } = await parseBody(request, createFeaturedOfferSchema);
  if (error) return error;

  const offer = await db.featuredOffer.create({
    data: {
      title: data.title,
      requirement: data.requirement,
      providerName: data.providerName,
      providerLogoUrl: data.providerLogoUrl || null,
      posterImageUrl: data.posterImageUrl || null,
      appIconUrl: data.appIconUrl || null,
      rewardHoney: data.rewardHoney,
      externalUrl: data.externalUrl || null,
      category: data.category,
      completions: data.completions,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  });

  return jsonOk({ offer }, 201);
});
