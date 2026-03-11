/**
 * GET /api/offers/providers
 *
 * Public endpoint — returns active offerwall providers for the Earn page.
 * Only exposes public fields (no secrets, no IPs).
 */
import { db } from "@/lib/db";
import { jsonOk } from "@/lib/middleware";

export async function GET() {
  const providers = await db.offerwallProvider.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      type: true,
      bonusBadgePct: true,
      iframeBaseUrl: true,
    },
  });

  return jsonOk({ providers });
}
