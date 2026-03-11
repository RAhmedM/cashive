/**
 * Lootably postback adapter.
 *
 * Lootably sends GET postbacks with parameters:
 *   - sub_id:      our user ID
 *   - payout:      payout in USD (e.g., "0.75")
 *   - txn_id:      unique transaction ID
 *   - offer:       offer name
 *   - offer_id:    external offer ID
 *   - ip_address:  user's IP
 *   - hash:        SHA-256(txn_id + sub_id + payout + secret)
 *   - type:        "credit" or "chargeback"
 *
 * Docs: https://docs.lootably.com
 */
import { createHash } from "crypto";
import type { PostbackAdapter, PostbackData } from "../types";

export const lootablyAdapter: PostbackAdapter = {
  slug: "lootably",

  parse(params: URLSearchParams): PostbackData {
    const userId = params.get("sub_id");
    const payout = params.get("payout");
    const txnId = params.get("txn_id");
    const offerName = params.get("offer") ?? "Unknown Offer";
    const offerId = params.get("offer_id") ?? "";
    const ipAddress = params.get("ip_address");
    const hash = params.get("hash");
    const type = params.get("type");

    if (!userId || !payout || !txnId) {
      throw new Error(
        "Missing required Lootably postback params: sub_id, payout, txn_id"
      );
    }

    const payoutUsd = parseFloat(payout);
    if (isNaN(payoutUsd) || payoutUsd < 0) {
      throw new Error(`Invalid Lootably payout: ${payout}`);
    }

    const payoutCentsUsd = Math.round(payoutUsd * 100);

    const rawPayload: Record<string, string> = {};
    params.forEach((value, key) => {
      rawPayload[key] = value;
    });

    return {
      userId,
      payoutCentsUsd,
      transactionId: txnId,
      offerName,
      offerId,
      userIp: ipAddress ?? undefined,
      signature: hash ?? undefined,
      isReversal: type === "chargeback",
      rawPayload,
    };
  },

  validateSignature(data: PostbackData, secret: string): boolean {
    if (!data.signature) return false;

    // Lootably: SHA-256(txn_id + sub_id + payout + secret)
    const payoutStr = data.rawPayload["payout"] ?? "";
    const payload = `${data.transactionId}${data.userId}${payoutStr}${secret}`;
    const expected = createHash("sha256").update(payload).digest("hex");

    return expected === data.signature;
  },
};
