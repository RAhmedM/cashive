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
 * 7. Always return 200 (offerwalls retry on non-200)
 *
 * IMPORTANT: Always return HTTP 200 to the offerwall, even on errors.
 * Returning non-200 causes offerwalls to retry, which we don't want for
 * validation failures or duplicate processing.
 */
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/postback/adapters";
import { processPostback } from "@/lib/postback/processor";
import { runPostbackSideEffects } from "@/lib/postback/side-effects";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerSlug } = await params;
  const url = new URL(request.url);
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
    console.warn(
      `[Postback] Unknown provider slug: ${providerSlug} from IP ${callerIp}`
    );
    // Return 200 anyway — don't reveal valid/invalid slugs
    return NextResponse.json({ status: "ok" });
  }

  if (!provider.isActive) {
    console.warn(
      `[Postback] Disabled provider ${providerSlug} received postback from IP ${callerIp}`
    );
    return NextResponse.json({ status: "ok" });
  }

  // 2. IP whitelist check (skip in development if no IPs configured)
  if (provider.postbackIps.length > 0) {
    const isWhitelisted = provider.postbackIps.some((allowedIp) => {
      // Support CIDR ranges in the future; for now exact match
      return callerIp === allowedIp;
    });

    if (!isWhitelisted) {
      console.warn(
        `[Postback] IP ${callerIp} not whitelisted for provider ${providerSlug}. ` +
          `Allowed: ${provider.postbackIps.join(", ")}`
      );
      // Return 200 to prevent offerwall retries, but log for investigation
      return NextResponse.json({ status: "ok" });
    }
  }

  // 3. Get the adapter for this provider
  const adapter = getAdapter(providerSlug);
  if (!adapter) {
    console.error(
      `[Postback] No adapter registered for provider: ${providerSlug}`
    );
    return NextResponse.json({ status: "ok" });
  }

  // 4. Parse the postback data
  let postbackData;
  try {
    postbackData = adapter.parse(searchParams);
  } catch (err) {
    console.error(
      `[Postback] Failed to parse ${providerSlug} postback:`,
      err instanceof Error ? err.message : err,
      `Params: ${searchParams.toString()}`
    );
    return NextResponse.json({ status: "ok" });
  }

  // 5. Validate signature
  const sigValid = adapter.validateSignature(
    postbackData,
    provider.postbackSecret
  );

  if (!sigValid) {
    console.warn(
      `[Postback] Invalid signature for ${providerSlug} tx ${postbackData.transactionId} from IP ${callerIp}`
    );
    // In production, reject invalid signatures. In dev, log and continue.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ status: "ok" });
    }
    console.warn(
      `[Postback] Skipping signature check in development mode`
    );
  }

  // 6. Process the postback (atomic core: dedup, credit, record)
  const result = await processPostback(providerSlug, postbackData);

  if (!result.success) {
    console.error(
      `[Postback] Processing failed for ${providerSlug} tx ${postbackData.transactionId}: ${result.error}`
    );
    return NextResponse.json({ status: "ok" });
  }

  if (result.duplicate) {
    console.info(
      `[Postback] Duplicate ${providerSlug} tx ${postbackData.transactionId} — already processed`
    );
    return NextResponse.json({ status: "ok" });
  }

  // 7. Fire side effects asynchronously (don't await — let them run in background)
  // In production with BullMQ, this would be a queued job.
  if (result.offerCompletionId) {
    void runPostbackSideEffects({
      userId: result.userId,
      rewardHoney: result.rewardHoney,
      offerName: postbackData.offerName,
      providerName: provider.name,
      providerSlug: provider.slug,
      offerCompletionId: result.offerCompletionId,
      isReversal: postbackData.isReversal,
    }).catch((err) => {
      console.error(
        `[Postback] Side effects failed for ${providerSlug} tx ${postbackData.transactionId}:`,
        err
      );
    });
  }

  console.info(
    `[Postback] ${postbackData.isReversal ? "Reversal" : "Credit"} processed: ` +
      `${providerSlug} tx ${postbackData.transactionId} ` +
      `user ${result.userId} → ${result.rewardHoney} Honey`
  );

  return NextResponse.json({ status: "ok" });
}
