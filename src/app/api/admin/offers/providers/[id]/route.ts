/**
 * GET    /api/admin/offers/providers/[id]  — Get provider details
 * PATCH  /api/admin/offers/providers/[id]  — Update a provider
 * DELETE /api/admin/offers/providers/[id]  — Delete a provider
 *
 * Admin-only endpoints for managing individual offerwall providers.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { updateProviderSchema } from "@/lib/validations/offers";

/**
 * GET — Get full provider details (including unmasked secret for admins).
 */
export const GET = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Provider ID is required", 400);

  const provider = await db.offerwallProvider.findUnique({
    where: { id },
    include: {
      _count: {
        select: { offerCompletions: true },
      },
    },
  });

  if (!provider) {
    return jsonError("Provider not found", 404);
  }

  return jsonOk({ provider });
});

/**
 * PATCH — Update provider configuration.
 */
export const PATCH = withAdmin(async (request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Provider ID is required", 400);

  const existing = await db.offerwallProvider.findUnique({ where: { id } });
  if (!existing) {
    return jsonError("Provider not found", 404);
  }

  const { data, error } = await parseBody(request, updateProviderSchema);
  if (error) return error;

  // If slug is being changed, check uniqueness
  if (data.slug && data.slug !== existing.slug) {
    const slugConflict = await db.offerwallProvider.findUnique({
      where: { slug: data.slug },
    });
    if (slugConflict) {
      return jsonError(
        `Provider with slug '${data.slug}' already exists`,
        409
      );
    }
  }

  const provider = await db.offerwallProvider.update({
    where: { id },
    data: {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
      ...(data.postbackSecret !== undefined && {
        postbackSecret: data.postbackSecret,
      }),
      ...(data.postbackIps !== undefined && { postbackIps: data.postbackIps }),
      ...(data.bonusBadgePct !== undefined && {
        bonusBadgePct: data.bonusBadgePct,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.iframeBaseUrl !== undefined && { iframeBaseUrl: data.iframeBaseUrl || null }),
      ...(data.revenueSharePct !== undefined && {
        revenueSharePct: data.revenueSharePct,
      }),
    },
  });

  return jsonOk({
    provider: {
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      isActive: provider.isActive,
      updatedAt: provider.updatedAt,
    },
  });
});

/**
 * DELETE — Delete a provider (only if no completions exist).
 */
export const DELETE = withAdmin(async (_request, _user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Provider ID is required", 400);

  const provider = await db.offerwallProvider.findUnique({
    where: { id },
    include: {
      _count: { select: { offerCompletions: true } },
    },
  });

  if (!provider) {
    return jsonError("Provider not found", 404);
  }

  // Prevent deletion if there are linked completions
  if (provider._count.offerCompletions > 0) {
    return jsonError(
      `Cannot delete provider '${provider.name}' — it has ${provider._count.offerCompletions} offer completion(s). ` +
        `Deactivate it instead.`,
      409
    );
  }

  await db.offerwallProvider.delete({ where: { id } });

  return jsonOk({ deleted: true });
});
