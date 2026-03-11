/**
 * POST /api/webhooks/coinbase
 *
 * Coinbase Commerce webhook endpoint — receives charge/payment events.
 *
 * Coinbase Commerce sends events for:
 * - charge:confirmed  — payment confirmed on blockchain
 * - charge:failed     — payment failed or expired
 * - charge:pending    — payment detected, awaiting confirmation
 *
 * We use the metadata.withdrawal_id to match events to our withdrawals.
 *
 * Signature verification: Coinbase signs webhooks with HMAC-SHA256
 * using the shared secret in the X-CC-Webhook-Signature header.
 */
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { honeyToUsd } from "@/lib/withdrawals/config";

export async function POST(request: Request) {
  // 1. Read raw body for signature verification
  const rawBody = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 2. Verify webhook signature
  const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-cc-webhook-signature");
    if (!signature) {
      console.warn("[Coinbase Webhook] Missing signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expected = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      console.warn("[Coinbase Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } else {
    console.warn(
      "[Coinbase Webhook] COINBASE_WEBHOOK_SECRET not set — skipping signature verification"
    );
  }

  // 3. Extract event data
  const event = body.event as Record<string, unknown> | undefined;
  if (!event) {
    return NextResponse.json({ status: "ok" });
  }

  const eventType = event.type as string;
  const eventData = event.data as Record<string, unknown> | undefined;

  if (!eventType || !eventData) {
    return NextResponse.json({ status: "ok" });
  }

  console.info(`[Coinbase Webhook] Received event: ${eventType}`);

  // 4. Extract withdrawal ID from metadata
  const metadata = eventData.metadata as Record<string, string> | undefined;
  const withdrawalId = metadata?.withdrawal_id;

  if (!withdrawalId) {
    console.warn("[Coinbase Webhook] No withdrawal_id in metadata");
    return NextResponse.json({ status: "ok" });
  }

  // 5. Look up the withdrawal
  const withdrawal = await db.withdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    console.warn(
      `[Coinbase Webhook] Withdrawal not found: ${withdrawalId}`
    );
    return NextResponse.json({ status: "ok" });
  }

  // Only process if still in PROCESSING state (idempotent)
  if (withdrawal.status !== "PROCESSING") {
    console.info(
      `[Coinbase Webhook] Withdrawal ${withdrawalId} already in status ${withdrawal.status} — skipping`
    );
    return NextResponse.json({ status: "ok" });
  }

  const chargeCode = (eventData.code as string) ?? null;

  // 6. Handle event types
  if (eventType === "charge:confirmed") {
    // Payment confirmed on blockchain
    await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        externalTxId: chargeCode,
      },
    });

    // Notify user
    void db.notification
      .create({
        data: {
          userId: withdrawal.userId,
          type: "withdrawal_complete",
          title: "Withdrawal Completed!",
          body: `Your $${withdrawal.amountUsd.toFixed(2)} crypto withdrawal has been confirmed.`,
          link: "/cashout",
        },
      })
      .catch(() => {});

    console.info(
      `[Coinbase Webhook] Withdrawal ${withdrawalId} confirmed — charge ${chargeCode}`
    );
  } else if (
    eventType === "charge:failed" ||
    eventType === "charge:expired"
  ) {
    // Payment failed — refund the user
    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "FAILED",
          reviewNote: `Coinbase ${eventType}: charge ${chargeCode ?? "unknown"}`,
        },
      });

      const user = await tx.user.update({
        where: { id: withdrawal.userId },
        data: { balanceHoney: { increment: withdrawal.amountHoney } },
        select: { balanceHoney: true },
      });

      await tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: "ADMIN_ADJUSTMENT",
          amount: withdrawal.amountHoney,
          balanceAfter: user.balanceHoney,
          sourceType: "withdrawal",
          sourceId: withdrawalId,
          description: `Crypto payout failed — ${withdrawal.amountHoney} Honey refunded ($${honeyToUsd(withdrawal.amountHoney).toFixed(2)})`,
          metadata: { coinbaseEvent: eventType, chargeCode },
        },
      });
    });

    // Notify user
    void db.notification
      .create({
        data: {
          userId: withdrawal.userId,
          type: "withdrawal_failed",
          title: "Withdrawal Failed",
          body: `Your $${withdrawal.amountUsd.toFixed(2)} crypto withdrawal could not be completed. Your balance has been refunded.`,
          link: "/cashout",
        },
      })
      .catch(() => {});

    console.warn(
      `[Coinbase Webhook] Withdrawal ${withdrawalId} failed — ${eventType}`
    );
  }
  // charge:pending — no action needed, stay in PROCESSING

  return NextResponse.json({ status: "ok" });
}
