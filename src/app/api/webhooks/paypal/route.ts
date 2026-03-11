/**
 * POST /api/webhooks/paypal
 *
 * PayPal webhook endpoint — receives payout status notifications.
 *
 * PayPal sends webhook events for:
 * - PAYMENT.PAYOUTSBATCH.SUCCESS — batch completed
 * - PAYMENT.PAYOUTSBATCH.DENIED  — batch denied
 * - PAYMENT.PAYOUTS-ITEM.SUCCEEDED — individual item succeeded
 * - PAYMENT.PAYOUTS-ITEM.FAILED    — individual item failed
 * - PAYMENT.PAYOUTS-ITEM.DENIED    — individual item denied
 *
 * We use the item-level events to update individual withdrawals.
 */
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { honeyToUsd } from "@/lib/withdrawals/config";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. Verify webhook signature (if configured)
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (webhookId) {
    const isValid = await verifyPayPalWebhook(request, body, webhookId);
    if (!isValid) {
      console.warn("[PayPal Webhook] Invalid signature — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn(
      "[PayPal Webhook] PAYPAL_WEBHOOK_ID not set — skipping signature verification"
    );
  }

  // 2. Extract event type and resource
  const eventType = body.event_type as string;
  const resource = body.resource as Record<string, unknown> | undefined;

  if (!eventType || !resource) {
    return NextResponse.json({ status: "ok" });
  }

  console.info(`[PayPal Webhook] Received event: ${eventType}`);

  // 3. Handle payout item events
  if (
    eventType === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED" ||
    eventType === "PAYMENT.PAYOUTS-ITEM.FAILED" ||
    eventType === "PAYMENT.PAYOUTS-ITEM.DENIED"
  ) {
    const senderItemId = resource.sender_item_id as string | undefined;
    if (!senderItemId) {
      console.warn("[PayPal Webhook] No sender_item_id in payout item event");
      return NextResponse.json({ status: "ok" });
    }

    // sender_item_id is our withdrawal ID
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: senderItemId },
    });

    if (!withdrawal) {
      console.warn(
        `[PayPal Webhook] Withdrawal not found: ${senderItemId}`
      );
      return NextResponse.json({ status: "ok" });
    }

    // Only process if still in PROCESSING state (idempotent)
    if (withdrawal.status !== "PROCESSING") {
      console.info(
        `[PayPal Webhook] Withdrawal ${senderItemId} already in status ${withdrawal.status} — skipping`
      );
      return NextResponse.json({ status: "ok" });
    }

    const payoutItemId =
      (resource.payout_item_id as string) ??
      (resource.transaction_id as string) ??
      null;

    if (eventType === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED") {
      // Mark as completed
      await db.withdrawal.update({
        where: { id: senderItemId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          externalTxId: payoutItemId,
        },
      });

      // Notify user
      void db.notification
        .create({
          data: {
            userId: withdrawal.userId,
            type: "withdrawal_complete",
            title: "Withdrawal Completed!",
            body: `Your $${withdrawal.amountUsd.toFixed(2)} PayPal withdrawal has been sent.`,
            link: "/cashout",
          },
        })
        .catch(() => {});

      console.info(
        `[PayPal Webhook] Withdrawal ${senderItemId} completed — PayPal item ${payoutItemId}`
      );
    } else {
      // Failed or denied — refund the user
      await db.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: senderItemId },
          data: {
            status: "FAILED",
            reviewNote: `PayPal ${eventType}: payout item ${payoutItemId ?? "unknown"}`,
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
            sourceId: senderItemId,
            description: `PayPal payout failed — ${withdrawal.amountHoney} Honey refunded ($${honeyToUsd(withdrawal.amountHoney).toFixed(2)})`,
            metadata: { paypalEvent: eventType, payoutItemId },
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
            body: `Your $${withdrawal.amountUsd.toFixed(2)} PayPal withdrawal could not be completed. Your balance has been refunded.`,
            link: "/cashout",
          },
        })
        .catch(() => {});

      console.warn(
        `[PayPal Webhook] Withdrawal ${senderItemId} failed — ${eventType}`
      );
    }
  }

  return NextResponse.json({ status: "ok" });
}

// ---- Signature Verification ----

async function verifyPayPalWebhook(
  request: Request,
  _body: Record<string, unknown>,
  _webhookId: string
): Promise<boolean> {
  // PayPal webhook verification requires calling PayPal's API:
  // POST /v1/notifications/verify-webhook-signature
  // with the webhook ID, transmission headers, and event body.
  //
  // Required headers from PayPal:
  // - PAYPAL-TRANSMISSION-ID
  // - PAYPAL-TRANSMISSION-TIME
  // - PAYPAL-TRANSMISSION-SIG
  // - PAYPAL-CERT-URL
  // - PAYPAL-AUTH-ALGO

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const transmissionSig = request.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !transmissionSig) {
    console.warn("[PayPal Webhook] Missing transmission headers");
    return false;
  }

  // In production, call PayPal's verification endpoint.
  // For now, we check that the expected headers are present.
  // TODO: Implement full PayPal webhook signature verification

  const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    // Can't verify without credentials — accept in dev, reject in prod
    return process.env.NODE_ENV !== "production";
  }

  try {
    const baseUrl =
      PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    // Get access token
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) return false;
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // Verify webhook
    const verifyRes = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: request.headers.get("paypal-auth-algo"),
          cert_url: request.headers.get("paypal-cert-url"),
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: _webhookId,
          webhook_event: _body,
        }),
      }
    );

    if (!verifyRes.ok) return false;
    const result = (await verifyRes.json()) as {
      verification_status: string;
    };

    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[PayPal Webhook] Verification error:", err);
    return false;
  }
}
