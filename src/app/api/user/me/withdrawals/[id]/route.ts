/**
 * GET /api/user/me/withdrawals/[id]
 *
 * Get details of a specific withdrawal for the authenticated user.
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/middleware";

export const GET = withAuth(async (_request, user, params) => {
  const id = params?.id;
  if (!id) return jsonError("Withdrawal ID is required", 400);

  const withdrawal = await db.withdrawal.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      method: true,
      amountHoney: true,
      amountUsdCents: true,
      feeUsdCents: true,
      paypalEmail: true,
      cryptoAddress: true,
      cryptoCurrency: true,
      giftCardType: true,
      giftCardEmail: true,
      status: true,
      reviewNote: true,
      processedAt: true,
      externalPaymentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!withdrawal) {
    return jsonError("Withdrawal not found", 404);
  }

  // Ensure the user owns this withdrawal
  if (withdrawal.userId !== user.id) {
    return jsonError("Withdrawal not found", 404);
  }

  // Mask sensitive fields
  const masked = {
    ...withdrawal,
    userId: undefined,
    paypalEmail: withdrawal.paypalEmail
      ? maskEmail(withdrawal.paypalEmail)
      : null,
    cryptoAddress: withdrawal.cryptoAddress
      ? maskCrypto(withdrawal.cryptoAddress)
      : null,
    giftCardEmail: withdrawal.giftCardEmail
      ? maskEmail(withdrawal.giftCardEmail)
      : null,
  };

  return jsonOk({ withdrawal: masked });
});

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
