/**
 * GET /api/admin/postback-logs
 *
 * List postback logs with filters and pagination.
 * Admin-only endpoint.
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, parseSearchParams } from "@/lib/middleware";
import type { PostbackResult } from "@/generated/prisma";

const VALID_RESULTS: PostbackResult[] = [
  "CREDITED",
  "DUPLICATE",
  "REJECTED_IP",
  "REJECTED_SIG",
  "REJECTED_USER",
  "ERROR",
];

export const GET = withAdmin(async (request) => {
  const params = parseSearchParams(request);

  const providerId = params.get("providerId") ?? undefined;
  const result = params.get("result") as PostbackResult | null;
  const userId = params.get("userId") ?? undefined;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "25", 10)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (providerId) where.providerId = providerId;
  if (result && VALID_RESULTS.includes(result)) where.result = result;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    db.postbackLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        provider: { select: { name: true, slug: true } },
      },
    }),
    db.postbackLog.count({ where }),
  ]);

  // Batch-fetch usernames for logs that have a userId
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users =
    userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.username]));

  const enrichedLogs = logs.map((log) => ({
    id: log.id,
    providerId: log.providerId,
    providerName: log.provider.name,
    providerSlug: log.provider.slug,
    rawUrl: log.rawUrl,
    sourceIp: log.sourceIp,
    result: log.result,
    errorDetail: log.errorDetail,
    userId: log.userId,
    username: log.userId ? userMap.get(log.userId) ?? null : null,
    externalTxId: log.externalTxId,
    processingMs: log.processingMs,
    createdAt: log.createdAt,
  }));

  return jsonOk({
    logs: enrichedLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
