/**
 * Core postback processor.
 *
 * Handles the critical path of postback processing:
 * 1. Validate provider exists and is active
 * 2. Deduplicate by externalTxId
 * 3. Calculate reward (payout × revenueSharePercent)
 * 4. Atomically credit user balance + create records
 *
 * Side effects (referral commission, streak, race, achievements, ticker)
 * are handled separately and asynchronously so the postback returns 200
 * quickly without risk of secondary failures causing retries.
 */
import { db } from "@/lib/db";
import { getVipBonusPercent } from "@/lib/engagement";
import type { PostbackData, PostbackResult } from "./types";

/**
 * Process a normalized postback. This is the atomic core — it either
 * fully credits the user or does nothing (idempotent on duplicates).
 */
export async function processPostback(
  providerSlug: string,
  data: PostbackData
): Promise<PostbackResult> {
  // 1. Look up the provider
  const provider = await db.offerwallProvider.findUnique({
    where: { slug: providerSlug },
  });

  if (!provider) {
    return {
      success: false,
      duplicate: false,
      rewardHoney: 0,
      marginHoney: 0,
      userId: data.userId,
      providerSlug,
      error: `Unknown provider: ${providerSlug}`,
    };
  }

  if (!provider.isActive) {
    return {
      success: false,
      duplicate: false,
      rewardHoney: 0,
      marginHoney: 0,
      userId: data.userId,
      providerSlug,
      error: `Provider ${providerSlug} is disabled`,
    };
  }

  // 2. Check if user exists
  const user = await db.user.findUnique({
    where: { id: data.userId },
    select: {
      id: true,
      balanceHoney: true,
      isBanned: true,
      vipTier: true,
      createdAt: true,
      fraudScore: true,
    },
  });

  if (!user) {
    return {
      success: false,
      duplicate: false,
      rewardHoney: 0,
      marginHoney: 0,
      userId: data.userId,
      providerSlug,
      error: `Unknown user: ${data.userId}`,
    };
  }

  // 3. Handle reversals separately
  if (data.isReversal) {
    return processReversal(provider, user, data);
  }

  // 4. Deduplication — check if we already processed this transaction
  const existing = await db.offerCompletion.findUnique({
    where: { externalTxId: data.transactionId },
  });

  if (existing) {
    // Already processed — return success (idempotent) but don't credit again
    return {
      success: true,
      duplicate: true,
      rewardHoney: 0,
      marginHoney: 0,
      offerCompletionId: existing.id,
      userId: data.userId,
      providerSlug,
    };
  }

  // 5. Hold check — new accounts (<48h) or high fraud score (>60)
  const accountAgeMs = Date.now() - user.createdAt.getTime();
  const isNewAccount = accountAgeMs < 48 * 60 * 60 * 1000;
  const isHighFraudScore = user.fraudScore > 60;
  const shouldHold = isNewAccount || isHighFraudScore;
  const holdReason = isNewAccount ? "new_account" : isHighFraudScore ? "high_fraud_score" : null;

  if (shouldHold) {
    const heldUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Calculate reward for the record, but don't credit
    const totalHoneyValue = data.payoutCentsUsd * 10;
    const rewardToUser = Math.floor(
      totalHoneyValue * (provider.revenueSharePct / 100)
    );
    const vipBonusPercent = getVipBonusPercent(user.vipTier);
    const vipBonusHoney = Math.floor(rewardToUser * vipBonusPercent / 100);
    const totalReward = rewardToUser + vipBonusHoney;
    const ourMargin = totalHoneyValue - totalReward;

    const offerCompletion = await db.offerCompletion.create({
      data: {
        userId: data.userId,
        providerId: provider.id,
        externalOfferId: data.offerId,
        externalTxId: data.transactionId,
        offerName: data.offerName,
        payoutToUsCents: data.payoutCentsUsd,
        rewardToUserHoney: totalReward,
        platformMarginHoney: ourMargin,
        vipBonusHoney,
        status: "HELD",
        holdReason,
        heldUntil,
        userIp: data.userIp,
        rawPostback: data.rawPayload,
      },
    });

    return {
      success: true,
      duplicate: false,
      held: true,
      rewardHoney: 0,
      marginHoney: ourMargin,
      offerCompletionId: offerCompletion.id,
      userId: data.userId,
      providerSlug,
    };
  }

  // 6. Calculate reward
  // payoutCentsUsd is what the offerwall pays us in cents
  // Convert to Honey: $1.00 = 1000 Honey, so 1 cent = 10 Honey
  const totalHoneyValue = data.payoutCentsUsd * 10;
  const rewardToUser = Math.floor(
    totalHoneyValue * (provider.revenueSharePct / 100)
  );

  // Apply VIP bonus
  const vipBonusPercent = getVipBonusPercent(user.vipTier);
  const vipBonusHoney = Math.floor(rewardToUser * vipBonusPercent / 100);
  const totalReward = rewardToUser + vipBonusHoney;

  const ourMargin = totalHoneyValue - totalReward;

  // 7. Atomic transaction: credit balance + create records
  // Skip crediting banned users but still record the completion
  const shouldCredit = !user.isBanned;
  const newBalance = shouldCredit
    ? user.balanceHoney + totalReward
    : user.balanceHoney;

  const result = await db.$transaction(async (tx) => {
    // Update user balance + lifetime earned
    if (shouldCredit) {
      await tx.user.update({
        where: { id: data.userId },
        data: {
          balanceHoney: { increment: totalReward },
          lifetimeEarned: { increment: totalReward },
        },
      });
    }

    // Create OfferCompletion record
    const offerCompletion = await tx.offerCompletion.create({
      data: {
        userId: data.userId,
        providerId: provider.id,
        externalOfferId: data.offerId,
        externalTxId: data.transactionId,
        offerName: data.offerName,
        payoutToUsCents: data.payoutCentsUsd,
        rewardToUserHoney: totalReward,
        platformMarginHoney: ourMargin,
        vipBonusHoney,
        status: user.isBanned ? "HELD" : "CREDITED",
        holdReason: user.isBanned ? "banned" : null,
        userIp: data.userIp,
        rawPostback: data.rawPayload,
      },
    });

    // Create Transaction record
    if (shouldCredit) {
      await tx.transaction.create({
        data: {
          userId: data.userId,
          type: provider.type === "SURVEY_WALL" ? "SURVEY_EARNING" : "OFFER_EARNING",
          amount: totalReward,
          balanceAfter: newBalance,
          sourceType: "OFFER",
          sourceId: offerCompletion.id,
          description: `Completed '${data.offerName}' on ${provider.name}`,
          metadata: {
            offerwallName: provider.name,
            offerName: data.offerName,
            externalTxId: data.transactionId,
            payoutCentsUsd: data.payoutCentsUsd,
            vipBonusHoney,
          },
        },
      });
    }

    return offerCompletion;
  });

  return {
    success: true,
    duplicate: false,
    held: false,
    rewardHoney: shouldCredit ? totalReward : 0,
    marginHoney: ourMargin,
    offerCompletionId: result.id,
    userId: data.userId,
    providerSlug,
  };
}

/**
 * Process a reversal/chargeback postback.
 *
 * Finds the original completion and deducts the reward.
 * If the user's balance goes negative, it's flagged for admin review.
 */
async function processReversal(
  provider: { id: string; name: string; slug: string },
  user: { id: string; balanceHoney: number },
  data: PostbackData
): Promise<PostbackResult> {
  // Find the original completion
  const original = await db.offerCompletion.findUnique({
    where: { externalTxId: data.transactionId },
  });

  if (!original) {
    // Nothing to reverse — might be a reversal for a tx we never processed
    return {
      success: true,
      duplicate: false,
      rewardHoney: 0,
      marginHoney: 0,
      userId: data.userId,
      providerSlug: provider.slug,
    };
  }

  if (original.status === "REVERSED") {
    // Already reversed — idempotent
    return {
      success: true,
      duplicate: true,
      rewardHoney: 0,
      marginHoney: 0,
      offerCompletionId: original.id,
      userId: data.userId,
      providerSlug: provider.slug,
    };
  }

  const deductAmount = original.rewardToUserHoney;
  const newBalance = user.balanceHoney - deductAmount;

  await db.$transaction(async (tx) => {
    // Mark the completion as reversed
    await tx.offerCompletion.update({
      where: { id: original.id },
      data: { status: "REVERSED", reversedAt: new Date() },
    });

    // Deduct from user balance (can go negative)
    await tx.user.update({
      where: { id: data.userId },
      data: {
        balanceHoney: { decrement: deductAmount },
        lifetimeEarned: { decrement: deductAmount },
      },
    });

    // Create chargeback transaction
    await tx.transaction.create({
      data: {
        userId: data.userId,
        type: "CHARGEBACK",
        amount: -deductAmount,
        balanceAfter: newBalance,
        sourceType: "OFFER",
        sourceId: original.id,
        description: `Chargeback: '${original.offerName}' on ${provider.name}`,
        metadata: {
          offerwallName: provider.name,
          offerName: original.offerName,
          originalTxId: data.transactionId,
          reversalPayload: data.rawPayload,
        },
      },
    });

    // If balance went negative, create a fraud event
    if (newBalance < 0) {
      await tx.fraudEvent.create({
        data: {
          userId: data.userId,
          eventType: "CHARGEBACK",
          scoreImpact: 20,
          scoreAfter: 0, // Will be recalculated by fraud scoring system
          detail: `Chargeback made balance negative (${newBalance} Honey). Offer: '${original.offerName}' on ${provider.name}`,
          evidence: {
            newBalance,
            deductAmount,
            externalTxId: data.transactionId,
          },
        },
      });
    }
  });

  return {
    success: true,
    duplicate: false,
    rewardHoney: -deductAmount,
    marginHoney: 0,
    offerCompletionId: original.id,
    userId: data.userId,
    providerSlug: provider.slug,
  };
}
