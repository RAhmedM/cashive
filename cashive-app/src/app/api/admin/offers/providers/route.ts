/**
 * GET  /api/admin/offers/providers  — List all offerwall providers
 * POST /api/admin/offers/providers  — Create a new offerwall provider
 *
 * Admin-only endpoints for managing offerwall provider configurations.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createProviderSchema } from "@/lib/validations/offers";

/**
 * GET — List all providers with basic stats.
 */
export const GET = withAdmin(async () => {
  const providers = await db.offerwallProvider.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { offers: true },
      },
    },
  });

  // Map to a safe response (don't expose postbackSecret in full)
  const result = providers.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    logoUrl: p.logoUrl,
    bonusPercent: p.bonusPercent,
    isActive: p.isActive,
    isSurveyWall: p.isSurveyWall,
    isWatchWall: p.isWatchWall,
    iframeUrl: p.iframeUrl,
    revenueSharePercent: p.revenueSharePercent,
    postbackIps: p.postbackIps,
    // Mask the secret — show first 4 and last 4 chars only
    postbackSecretMasked: maskSecret(p.postbackSecret),
    totalCompletions: p._count.offers,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return jsonOk({ providers: result });
});

/**
 * POST — Create a new offerwall provider.
 */
export const POST = withAdmin(async (request) => {
  const { data, error } = await parseBody(request, createProviderSchema);
  if (error) return error;

  // Check slug uniqueness
  const existing = await db.offerwallProvider.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    return jsonError(`Provider with slug '${data.slug}' already exists`, 409);
  }

  const provider = await db.offerwallProvider.create({
    data: {
      slug: data.slug,
      name: data.name,
      logoUrl: data.logoUrl || null,
      postbackSecret: data.postbackSecret,
      postbackIps: data.postbackIps,
      bonusPercent: data.bonusPercent,
      isActive: data.isActive,
      isSurveyWall: data.isSurveyWall,
      isWatchWall: data.isWatchWall,
      iframeUrl: data.iframeUrl || null,
      revenueSharePercent: data.revenueSharePercent,
    },
  });

  return jsonOk(
    {
      provider: {
        id: provider.id,
        slug: provider.slug,
        name: provider.name,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
      },
    },
    201
  );
});

// ---- Helpers ----

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}${"*".repeat(secret.length - 8)}${secret.slice(-4)}`;
}
