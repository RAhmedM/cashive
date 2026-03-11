/**
 * CPX Research postback adapter.
 *
 * CPX Research is a survey wall that sends GET postbacks with parameters:
 *   - ext_user_id:     our user ID
 *   - amount_usd:      payout in USD (e.g., "0.35")
 *   - trans_id:        unique transaction ID
 *   - offer_title:     survey title
 *   - survey_id:       external survey/offer ID
 *   - user_ip:         user's IP
 *   - secure_hash:     MD5(trans_id + "-" + ext_user_id + "-" + secret_key)
 *   - status:          "1" = completed, "2" = reversed
 *
 * Docs: https://docs.cpx-research.com
 */
import { createHash } from "crypto";
import type { PostbackAdapter, PostbackData } from "../types";

export const cpxResearchAdapter: PostbackAdapter = {
  slug: "cpx-research",

  parse(params: URLSearchParams): PostbackData {
    const userId = params.get("ext_user_id");
    const amountUsd = params.get("amount_usd");
    const transId = params.get("trans_id");
    const offerTitle = params.get("offer_title") ?? "Survey";
    const surveyId = params.get("survey_id") ?? "";
    const userIp = params.get("user_ip");
    const secureHash = params.get("secure_hash");
    const status = params.get("status");

    if (!userId || !amountUsd || !transId) {
      throw new Error(
        "Missing required CPX Research postback params: ext_user_id, amount_usd, trans_id"
      );
    }

    const payoutUsd = parseFloat(amountUsd);
    if (isNaN(payoutUsd) || payoutUsd < 0) {
      throw new Error(`Invalid CPX Research amount_usd: ${amountUsd}`);
    }

    const payoutCentsUsd = Math.round(payoutUsd * 100);

    const rawPayload: Record<string, string> = {};
    params.forEach((value, key) => {
      rawPayload[key] = value;
    });

    return {
      userId,
      payoutCentsUsd,
      transactionId: transId,
      offerName: offerTitle,
      offerId: surveyId,
      userIp: userIp ?? undefined,
      signature: secureHash ?? undefined,
      isReversal: status === "2",
      rawPayload,
    };
  },

  validateSignature(data: PostbackData, secret: string): boolean {
    if (!data.signature) return false;

    // CPX Research: MD5(trans_id + "-" + ext_user_id + "-" + secret_key)
    const payload = `${data.transactionId}-${data.userId}-${secret}`;
    const expected = createHash("md5").update(payload).digest("hex");

    return expected === data.signature;
  },
};
