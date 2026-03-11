/**
 * GET  /api/user/me/withdrawals         — List user's withdrawals
 * POST /api/user/me/withdrawals         — Create a new withdrawal request
 *
 * Authenticated user endpoints for managing withdrawals.
 */
import { db } from "@/lib/db";
import {
  withAuth,
  jsonOk,
  jsonError,
  parseBody,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/middleware";
import { createWithdrawalSchema } from "@/lib/validations/withdrawals";
import {
  WITHDRAWAL_METHODS,
  honeyToUsd,
  calculateFeeUsd,
  DAILY_WITHDRAWAL_LIMIT_HONEY,
  MAX_PENDING_WITHDRAWALS,
} from "@/lib/withdrawals/config";

/**
 * GET — List the authenticated user's withdrawals.
 *
 * Query params:
 *   - status: filter by status (e.g., "PENDING", "COMPLETED")
 *   - limit:  max results (default 20, max 100)
 *   - offset: pagination offset (default 0)
 */
export const GET = withAuth(async (request, user) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    100
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0
  );

  const where = {
    userId: user.id,
    ...(status ? { status: status as "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "FAILED" } : {}),
  };

  const [withdrawals, total] = await Promise.all([
    db.withdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        method: true,
        amountHoney: true,
        amountUsd: true,
        fee: true,
        status: true,
        reviewNote: true,
        processedAt: true,
        externalTxId: true,
        createdAt: true,
        updatedAt: true,
        // Include masked destination (for display, not full address)
        paypalEmail: true,
        cryptoAddress: true,
        giftCardType: true,
        giftCardEmail: true,
      },
    }),
    db.withdrawal.count({ where }),
  ]);

  // Mask sensitive destination details
  const masked = withdrawals.map((w) => ({
    ...w,
    paypalEmail: w.paypalEmail ? maskEmail(w.paypalEmail) : null,
    cryptoAddress: w.cryptoAddress ? maskCrypto(w.cryptoAddress) : null,
    giftCardEmail: w.giftCardEmail ? maskEmail(w.giftCardEmail) : null,
  }));

  return jsonOk({ withdrawals: masked, total, limit, offset });
});

/**
 * POST — Create a new withdrawal request.
 *
 * Flow:
 * 1. Validate input (method, amount, destination)
 * 2. Check method is enabled
 * 3. Check min/max amounts
 * 4. Check sufficient balance
 * 5. Check pending withdrawal limit
 * 6. Check daily withdrawal limit
 * 7. Check account requirements (email verified, not banned)
 * 8. Atomically deduct balance + create Withdrawal + create Transaction
 * 9. Send notification
 */
export const POST = withAuth(async (request, user) => {
  // Rate limit
  const limited = await rateLimit(request, RATE_LIMITS.withdrawal, user.id);
  if (limited) return limited;

  // Parse and validate body
  const { data, error } = await parseBody(request, createWithdrawalSchema);
  if (error) return error;

  // 1. Check method is enabled
  const methodConfig = WITHDRAWAL_METHODS[data.method];
  if (!methodConfig || !methodConfig.enabled) {
    return jsonError(
      `Withdrawal method '${data.method}' is not currently available`,
      400
    );
  }

  // 2. Check min/max
  if (data.amountHoney < methodConfig.minHoney) {
    return jsonError(
      `Minimum withdrawal for ${methodConfig.name} is ${methodConfig.minHoney} Honey ($${honeyToUsd(methodConfig.minHoney).toFixed(2)})`,
      400
    );
  }
  if (methodConfig.maxHoney > 0 && data.amountHoney > methodConfig.maxHoney) {
    return jsonError(
      `Maximum withdrawal for ${methodConfig.name} is ${methodConfig.maxHoney} Honey ($${honeyToUsd(methodConfig.maxHoney).toFixed(2)})`,
      400
    );
  }

  // 3. Check account requirements
  if (!user.emailVerified) {
    return jsonError("Email must be verified before withdrawing", 403);
  }
  if (user.isBanned) {
    return jsonError("Account is suspended", 403);
  }

  // 4. Check sufficient balance
  if (user.balanceHoney < data.amountHoney) {
    return jsonError(
      `Insufficient balance. You have ${user.balanceHoney} Honey but requested ${data.amountHoney}`,
      400
    );
  }

  // 5. Check pending withdrawal limit
  const pendingCount = await db.withdrawal.count({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pendingCount >= MAX_PENDING_WITHDRAWALS) {
    return jsonError(
      `You can have at most ${MAX_PENDING_WITHDRAWALS} pending withdrawal requests. Please wait for existing ones to be processed.`,
      400
    );
  }

  // 6. Check daily withdrawal limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyTotal = await db.withdrawal.aggregate({
    where: {
      userId: user.id,
      createdAt: { gte: todayStart },
      status: { notIn: ["REJECTED", "FAILED"] },
    },
    _sum: { amountHoney: true },
  });
  const todaysTotal = (dailyTotal._sum.amountHoney ?? 0) + data.amountHoney;
  if (todaysTotal > DAILY_WITHDRAWAL_LIMIT_HONEY) {
    return jsonError(
      `Daily withdrawal limit is ${DAILY_WITHDRAWAL_LIMIT_HONEY} Honey ($${honeyToUsd(DAILY_WITHDRAWAL_LIMIT_HONEY).toFixed(2)}). ` +
        `You have already requested ${dailyTotal._sum.amountHoney ?? 0} Honey today.`,
      400
    );
  }

  // 7. Calculate amounts
  const amountUsd = honeyToUsd(data.amountHoney);
  const feeUsd = calculateFeeUsd(data.method, data.amountHoney);
  const newBalance = user.balanceHoney - data.amountHoney;

  // Map crypto methods to their currency codes
  const cryptoCurrencyMap: Record<string, string> = {
    BITCOIN: "BTC",
    ETHEREUM: "ETH",
    LITECOIN: "LTC",
    SOLANA: "SOL",
  };

  // Map gift card methods to their type
  const giftCardTypeMap: Record<string, string> = {
    AMAZON_GIFT: "Amazon",
    STEAM_GIFT: "Steam",
    ROBLOX: "Roblox",
  };

  // 8. Atomic transaction: deduct balance + create records
  const withdrawal = await db.$transaction(async (tx) => {
    // Deduct balance
    await tx.user.update({
      where: { id: user.id },
      data: { balanceHoney: { decrement: data.amountHoney } },
    });

    // Create Withdrawal record
    const w = await tx.withdrawal.create({
      data: {
        userId: user.id,
        method: data.method,
        amountHoney: data.amountHoney,
        amountUsd,
        fee: feeUsd,
        paypalEmail: data.paypalEmail ?? null,
        cryptoAddress: data.cryptoAddress ?? null,
        cryptoCurrency: cryptoCurrencyMap[data.method] ?? null,
        giftCardType: giftCardTypeMap[data.method] ?? null,
        giftCardEmail: data.giftCardEmail ?? null,
        status: "PENDING",
      },
    });

    // Create Transaction ledger entry
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "WITHDRAWAL",
        amount: -data.amountHoney,
        balanceAfter: newBalance,
        sourceType: "withdrawal",
        sourceId: w.id,
        description: `Withdrawal: $${amountUsd.toFixed(2)} via ${methodConfig.name}`,
        metadata: {
          method: data.method,
          feeUsd,
          idempotencyKey: w.idempotencyKey,
        },
      },
    });

    return w;
  });

  // 9. Create notification (non-blocking)
  void db.notification
    .create({
      data: {
        userId: user.id,
        type: "withdrawal_pending",
        title: "Withdrawal Requested",
        body: `Your $${amountUsd.toFixed(2)} ${methodConfig.name} withdrawal is being reviewed.`,
        link: "/cashout",
      },
    })
    .catch(() => {});

  return jsonOk(
    {
      withdrawal: {
        id: withdrawal.id,
        method: withdrawal.method,
        amountHoney: withdrawal.amountHoney,
        amountUsd: withdrawal.amountUsd,
        fee: withdrawal.fee,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
      },
      newBalance,
    },
    201
  );
});

// ---- Helpers ----

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const visibleChars = Math.min(2, local.length);
  return `${local.slice(0, visibleChars)}${"*".repeat(Math.max(0, local.length - visibleChars))}@${domain}`;
}

function maskCrypto(address: string): string {
  if (address.length <= 10) return "***";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
