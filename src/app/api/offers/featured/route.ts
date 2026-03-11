/**
 * GET /api/offers/featured
 *
 * Public endpoint — returns active featured offers for the Earn page.
 * Supports optional category filter via ?category=Game
 */
import { db } from "@/lib/db";
import { jsonOk } from "@/lib/middleware";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  const offers = await db.featuredOffer.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      requirement: true,
      providerName: true,
      providerLogoUrl: true,
      posterImageUrl: true,
      appIconUrl: true,
      rewardHoney: true,
      externalUrl: true,
      category: true,
      completions: true,
    },
  });

  // Extract unique categories for filtering UI
  const allOffers = await db.featuredOffer.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = allOffers.map((o) => o.category);

  return jsonOk({ offers, categories });
}
