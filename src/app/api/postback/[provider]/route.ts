/**
 * GET /api/postback/[provider]
 *
 * Universal postback endpoint for all offerwall providers.
 * Each provider sends a GET request with provider-specific query parameters.
 *
 * Flow:
 * 1. Validate IP against provider whitelist
 * 2. Route to the correct adapter based on [provider] slug
 * 3. Parse & normalize the postback data
 * 4. Validate the signature against the provider's shared secret
 * 5. Process the postback (atomic credit)
 * 6. Fire side effects asynchronously
 * 7. Log every postback to PostbackLog
 * 8. Always return 200 (offerwalls retry on non-200)
 *
 * IMPORTANT: Always return HTTP 200 to the offerwall, even on errors.
 * Returning non-200 causes offerwalls to retry, which we don't want for
 * validation failures or duplicate processing.
 */
import { NextResponse } from "next/server";
import { postbackLogger } from "@/lib/logger";
import { getAdapter } from "@/lib/postback/adapters";
import { processPostback } from "@/lib/postback/processor";
import { runPostbackSideEffects } from "@/lib/postback/side-effects";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth";
import type { PostbackResult } from "@/lib/postback/types";
import type { PostbackResult as PostbackResultEnum } from "@/generated/prisma";

/** Map processor outcome to PostbackLog result enum. */
function mapToLogResult(
  result: PostbackResult,
  context: { rejectedIp?: boolean; rejectedSig?: boolean }
): PostbackResultEnum {
  if (context.rejectedIp) return "REJECTED_IP";
  if (context.rejectedSig) return "REJECTED_SIG";
  if (!result.success) {
    if (result.error?.includes("Unknown user")) return "REJECTED_USER";
    return "ERROR";
  }
  if (result.duplicate) return "DUPLICATE";
  return "CREDITED";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const startTime = Date.now();
  const { provider: providerSlug } = await params;
  const url = new URL(request.url);
  const rawUrl = url.pathname + url.search;
  const searchParams = url.searchParams;
  const callerIp = getClientIp(request);

  // 1. Look up the provider in the database
  const provider = await db.offerwallProvider.findUnique({
    where: { slug: providerSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      postbackSecret: true,
      postbackIps: true,
      isActive: true,
    },
  });

  if (!provider) {
    postbackLogger.warn({ providerSlug, callerIp }, "Unknown provider slug");
    // Cannot log — no provider ID. Return 200 anyway.
    return NextResponse.json({ status: "ok" });
  }

  if (!provider.isActive) {
    postbackLogger.warn({ providerSlug, callerIp }, "Disabled provider received postback");
    void logPostback({
      providerId: provider.id,
      rawUrl,
      sourceIp: callerIp,
      result: "ERROR",
      errorDetail: `Provider ${providerSlug} is disabled`,
      processingMs: Date.now() - startTime,
    });
    return NextResponse.json({ status: "ok" });
  }

  // 2. IP whitelist check (skip in development if no IPs configured)
  if (provider.postbackIps.length > 0) {
    const isWhitelisted = provider.postbackIps.some((allowedIp) => {
      // Support CIDR ranges in the future; for now exact match
      return callerIp === allowedIp;
    });

    if (!isWhitelisted) {
      postbackLogger.warn(
        { callerIp, providerSlug, allowedIps: provider.postbackIps },
        "IP not whitelisted for provider"
      );
      void logPostback({
        providerId: provider.id,
        rawUrl,
        sourceIp: callerIp,
        result: "REJECTED_IP",
        errorDetail: `IP ${callerIp} not whitelisted`,
        processingMs: Date.now() - startTime,
      });
      // Return 200 to prevent offerwall retries, but log for investigation
      return NextResponse.json({ status: "ok" });
    }
  }

  // 3. Get the adapter for this provider
  const adapter = getAdapter(providerSlug);
  if (!adapter) {
    postbackLogger.error({ providerSlug }, "No adapter registered for provider");
    void logPostback({
      providerId: provider.id,
      rawUrl,
      sourceIp: callerIp,
      result: "ERROR",
      errorDetail: `No adapter registered for provider: ${providerSlug}`,
      processingMs: Date.now() - startTime,
    });
    return NextResponse.json({ status: "ok" });
  }

  // 4. Parse the postback data
  let postbackData;
  try {
    postbackData = adapter.parse(searchParams);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    postbackLogger.error(
      { providerSlug, error: errMsg, params: searchParams.toString() },
      "Failed to parse postback"
    );
    void logPostback({
      providerId: provider.id,
      rawUrl,
      sourceIp: callerIp,
      result: "ERROR",
      errorDetail: `Parse failed: ${errMsg}`,
      processingMs: Date.now() - startTime,
    });
    return NextResponse.json({ status: "ok" });
  }

  // 5. Validate signature
  const sigValid = adapter.validateSignature(
    postbackData,
    provider.postbackSecret
  );

  if (!sigValid) {
    postbackLogger.warn(
      { providerSlug, transactionId: postbackData.transactionId, callerIp },
      "Invalid signature"
    );
    // In production, reject invalid signatures. In dev, log and continue.
    if (process.env.NODE_ENV === "production") {
      void logPostback({
        providerId: provider.id,
        rawUrl,
        sourceIp: callerIp,
        result: "REJECTED_SIG",
        errorDetail: `Invalid signature for tx ${postbackData.transactionId}`,
        userId: postbackData.userId,
        externalTxId: postbackData.transactionId,
        processingMs: Date.now() - startTime,
      });
      return NextResponse.json({ status: "ok" });
    }
    postbackLogger.warn("Skipping signature check in development mode");
  }

  // 6. Process the postback (atomic core: dedup, credit, record)
  const result = await processPostback(providerSlug, postbackData);

  // 7. Log postback result (outside the atomic transaction — never causes credit to fail)
  const logResult = mapToLogResult(result, {});
  void logPostback({
    providerId: provider.id,
    rawUrl,
    sourceIp: callerIp,
    result: logResult,
    errorDetail: result.error ?? null,
    userId: postbackData.userId,
    externalTxId: postbackData.transactionId,
    processingMs: Date.now() - startTime,
  });

  if (!result.success) {
    postbackLogger.error(
      { providerSlug, transactionId: postbackData.transactionId, error: result.error },
      "Processing failed"
    );
    return NextResponse.json({ status: "ok" });
  }

  if (result.duplicate) {
    postbackLogger.info(
      { providerSlug, transactionId: postbackData.transactionId },
      "Duplicate postback — already processed"
    );
    return NextResponse.json({ status: "ok" });
  }

  // 8. Fire side effects asynchronously (don't await — let them run in background)
  // Skip side effects for held completions — they'll be triggered on release.
  // In production with BullMQ, this would be a queued job.
  if (result.offerCompletionId && !result.held) {
    void runPostbackSideEffects({
      userId: result.userId,
      rewardHoney: result.rewardHoney,
      offerName: postbackData.offerName,
      providerName: provider.name,
      providerSlug: provider.slug,
      offerCompletionId: result.offerCompletionId,
      isReversal: postbackData.isReversal,
    }).catch((err) => {
      postbackLogger.error(
        { err, providerSlug, transactionId: postbackData.transactionId },
        "Side effects failed"
      );
    });
  }

  postbackLogger.info(
    {
      action: result.held ? "held" : postbackData.isReversal ? "reversal" : "credit",
      providerSlug,
      transactionId: postbackData.transactionId,
      userId: result.userId,
      rewardHoney: result.rewardHoney,
      held: result.held ?? false,
    },
    "Postback processed"
  );

  return NextResponse.json({ status: "ok" });
}

/**
 * Log a postback to the PostbackLog table.
 * Runs outside the main transaction so it never causes credits to fail.
 */
async function logPostback(data: {
  providerId: string;
  rawUrl: string;
  sourceIp: string;
  result: PostbackResultEnum;
  errorDetail?: string | null;
  userId?: string;
  externalTxId?: string;
  processingMs: number;
}): Promise<void> {
  try {
    await db.postbackLog.create({
      data: {
        providerId: data.providerId,
        rawUrl: data.rawUrl,
        sourceIp: data.sourceIp,
        result: data.result,
        errorDetail: data.errorDetail ?? undefined,
        userId: data.userId ?? undefined,
        externalTxId: data.externalTxId ?? undefined,
        processingMs: data.processingMs,
      },
    });
  } catch (err) {
    postbackLogger.error({ err }, "Failed to write PostbackLog");
  }
}
