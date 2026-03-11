/**
 * BitLabs postback adapter.
 *
 * BitLabs is a survey wall that sends GET postbacks with parameters:
 *   - user_id:       our user ID
 *   - value:         payout in USD (e.g., "0.50")
 *   - tx:            unique transaction ID
 *   - offer_name:    survey/offer name
 *   - campaign_id:   survey campaign ID
 *   - ip:            user's IP
 *   - hash:          HMAC-SHA1(user_id:tx:value, secret)
 *   - status:        "complete" or "screenout" or "reversal"
 *
 * Docs: https://docs.bitlabs.ai
 */
import { createHmac } from "crypto";
import type { PostbackAdapter, PostbackData } from "../types";

export const bitlabsAdapter: PostbackAdapter = {
  slug: "bitlabs",

  parse(params: URLSearchParams): PostbackData {
    const userId = params.get("user_id");
    const value = params.get("value");
    const tx = params.get("tx");
    const offerName = params.get("offer_name") ?? "Survey";
    const campaignId = params.get("campaign_id") ?? "";
    const ip = params.get("ip");
    const hash = params.get("hash");
    const status = params.get("status");

    if (!userId || !value || !tx) {
      throw new Error(
        "Missing required BitLabs postback params: user_id, value, tx"
      );
    }

    const payoutUsd = parseFloat(value);
    if (isNaN(payoutUsd) || payoutUsd < 0) {
      throw new Error(`Invalid BitLabs value: ${value}`);
    }

    const payoutCentsUsd = Math.round(payoutUsd * 100);

    const rawPayload: Record<string, string> = {};
    params.forEach((value, key) => {
      rawPayload[key] = value;
    });

    return {
      userId,
      payoutCentsUsd,
      transactionId: tx,
      offerName,
      offerId: campaignId,
      userIp: ip ?? undefined,
      signature: hash ?? undefined,
      isReversal: status === "reversal",
      rawPayload,
    };
  },

  validateSignature(data: PostbackData, secret: string): boolean {
    if (!data.signature) return false;

    // BitLabs: HMAC-SHA1(user_id:tx:value, secret)
    const valueStr = data.rawPayload["value"] ?? "";
    const payload = `${data.userId}:${data.transactionId}:${valueStr}`;
    const expected = createHmac("sha1", secret)
      .update(payload)
      .digest("hex");

    return expected === data.signature;
  },
};
