/**
 * GET /api/user/me/withdrawals/methods
 *
 * Public-facing endpoint that returns available withdrawal methods
 * with their configuration (min/max, fees, availability).
 * Requires authentication so we can show user-specific info.
 */
import { withAuth, jsonOk } from "@/lib/middleware";
import { WITHDRAWAL_METHODS, honeyToUsd } from "@/lib/withdrawals/config";

export const GET = withAuth(async (_request, user) => {
  const methods = Object.entries(WITHDRAWAL_METHODS).map(([key, config]) => ({
    method: key,
    name: config.name,
    category: config.category,
    minHoney: config.minHoney,
    minUsd: honeyToUsd(config.minHoney),
    maxHoney: config.maxHoney,
    maxUsd: config.maxHoney > 0 ? honeyToUsd(config.maxHoney) : null,
    feeUsd: config.feeUsd,
    feePercent: config.feePercent,
    enabled: config.enabled,
    estimatedTime: config.estimatedTime,
    requiredFields: config.requiredFields,
    /** Whether the user meets the minimum balance for this method */
    canAfford: user.balanceHoney >= config.minHoney,
  }));

  return jsonOk({
    methods,
    userBalance: user.balanceHoney,
    userBalanceUsd: honeyToUsd(user.balanceHoney),
  });
});
