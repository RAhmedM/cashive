/**
 * AdGem postback adapter.
 *
 * AdGem sends GET postbacks with parameters:
 *   - player_id:         our user ID
 *   - amount:            payout in USD cents (integer, e.g., "150" = $1.50)
 *   - transaction_id:    unique transaction ID
 *   - offer_name:        offer title
 *   - campaign_id:       external offer/campaign ID
 *   - user_ip:           user's IP
 *   - signature:         MD5(transaction_id:secret_key)
 *   - reversal:          "1" if chargeback
 *
 * Docs: https://docs.adgem.com/publisher/postback
 */
import { createHash } from "crypto";
import type { PostbackAdapter, PostbackData } from "../types";

export const adgemAdapter: PostbackAdapter = {
  slug: "adgem",

  parse(params: URLSearchParams): PostbackData {
    const userId = params.get("player_id");
    const amount = params.get("amount");
    const txId = params.get("transaction_id");
    const offerName = params.get("offer_name") ?? "Unknown Offer";
    const campaignId = params.get("campaign_id") ?? "";
    const userIp = params.get("user_ip");
    const signature = params.get("signature");
    const reversal = params.get("reversal");

    if (!userId || !amount || !txId) {
      throw new Error(
        "Missing required AdGem postback params: player_id, amount, transaction_id"
      );
    }

    // AdGem sends amount in USD cents as an integer
    const payoutCentsUsd = parseInt(amount, 10);
    if (isNaN(payoutCentsUsd) || payoutCentsUsd < 0) {
      throw new Error(`Invalid AdGem amount: ${amount}`);
    }

    const rawPayload: Record<string, string> = {};
    params.forEach((value, key) => {
      rawPayload[key] = value;
    });

    return {
      userId,
      payoutCentsUsd,
      transactionId: txId,
      offerName,
      offerId: campaignId,
      userIp: userIp ?? undefined,
      signature: signature ?? undefined,
      isReversal: reversal === "1",
      rawPayload,
    };
  },

  validateSignature(data: PostbackData, secret: string): boolean {
    if (!data.signature) return false;

    // AdGem: MD5(transaction_id:secret_key)
    const payload = `${data.transactionId}:${secret}`;
    const expected = createHash("md5").update(payload).digest("hex");

    return expected === data.signature;
  },
};
