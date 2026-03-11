/**
 * Torox postback adapter.
 *
 * Torox sends GET postbacks with parameters:
 *   - user_id:     our user ID (passed as sub_id)
 *   - amount:      payout in USD (e.g., "1.50")
 *   - tx_id:       unique transaction ID
 *   - offer_name:  offer title
 *   - offer_id:    external offer ID
 *   - ip:          user's IP address
 *   - sig:         HMAC-SHA256 signature
 *   - status:      "1" = credit, "2" = reversal
 *
 * Signature: HMAC-SHA256(tx_id + user_id + amount, secret)
 */
import { createHmac } from "crypto";
import type { PostbackAdapter, PostbackData } from "../types";

export const toroxAdapter: PostbackAdapter = {
  slug: "torox",

  parse(params: URLSearchParams): PostbackData {
    const userId = params.get("user_id");
    const amount = params.get("amount");
    const txId = params.get("tx_id");
    const offerName = params.get("offer_name");
    const offerId = params.get("offer_id");
    const ip = params.get("ip");
    const sig = params.get("sig");
    const status = params.get("status");

    if (!userId || !amount || !txId || !offerName || !offerId) {
      throw new Error(
        "Missing required Torox postback params: user_id, amount, tx_id, offer_name, offer_id"
      );
    }

    const payoutUsd = parseFloat(amount);
    if (isNaN(payoutUsd) || payoutUsd < 0) {
      throw new Error(`Invalid Torox amount: ${amount}`);
    }

    // Convert USD to cents
    const payoutCentsUsd = Math.round(payoutUsd * 100);

    // Build raw payload for audit
    const rawPayload: Record<string, string> = {};
    params.forEach((value, key) => {
      rawPayload[key] = value;
    });

    return {
      userId,
      payoutCentsUsd,
      transactionId: txId,
      offerName,
      offerId,
      userIp: ip ?? undefined,
      signature: sig ?? undefined,
      isReversal: status === "2",
      rawPayload,
    };
  },

  validateSignature(data: PostbackData, secret: string): boolean {
    if (!data.signature) return false;

    // Torox signs: tx_id + user_id + amount (original USD string)
    const amountStr = data.rawPayload["amount"] ?? "";
    const payload = `${data.transactionId}${data.userId}${amountStr}`;
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return expected === data.signature;
  },
};
