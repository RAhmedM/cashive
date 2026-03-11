/**
 * Withdrawal configuration.
 *
 * Defines minimum amounts, fees, and availability for each withdrawal method.
 * All Honey amounts use integer units (1000 Honey = $1.00 USD).
 */

export interface WithdrawalMethodConfig {
  /** Display name */
  name: string;
  /** Minimum withdrawal in Honey */
  minHoney: number;
  /** Maximum withdrawal per request in Honey (0 = no limit) */
  maxHoney: number;
  /** Fixed fee in USD (deducted from payout, not from Honey balance) */
  feeUsd: number;
  /** Percentage fee (0-100, applied after fixed fee) */
  feePercent: number;
  /** Whether this method is currently available */
  enabled: boolean;
  /** Estimated processing time (human readable) */
  estimatedTime: string;
  /** Category for grouping in UI */
  category: "fiat" | "crypto" | "gift_card";
  /** Fields required from the user */
  requiredFields: string[];
}

/**
 * Master configuration for all withdrawal methods.
 * Keys match the WithdrawalMethod enum from Prisma.
 */
export const WITHDRAWAL_METHODS: Record<string, WithdrawalMethodConfig> = {
  PAYPAL: {
    name: "PayPal",
    minHoney: 5000, // $5.00
    maxHoney: 500000, // $500.00
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "1-24 hours",
    category: "fiat",
    requiredFields: ["paypalEmail"],
  },
  BITCOIN: {
    name: "Bitcoin",
    minHoney: 10000, // $10.00
    maxHoney: 1000000, // $1,000.00
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "1-24 hours",
    category: "crypto",
    requiredFields: ["cryptoAddress"],
  },
  ETHEREUM: {
    name: "Ethereum",
    minHoney: 10000, // $10.00
    maxHoney: 1000000,
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "1-24 hours",
    category: "crypto",
    requiredFields: ["cryptoAddress"],
  },
  LITECOIN: {
    name: "Litecoin",
    minHoney: 5000, // $5.00
    maxHoney: 500000,
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "1-24 hours",
    category: "crypto",
    requiredFields: ["cryptoAddress"],
  },
  SOLANA: {
    name: "Solana",
    minHoney: 5000, // $5.00
    maxHoney: 500000,
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "1-24 hours",
    category: "crypto",
    requiredFields: ["cryptoAddress"],
  },
  AMAZON_GIFT: {
    name: "Amazon Gift Card",
    minHoney: 5000, // $5.00
    maxHoney: 100000, // $100.00
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "Instant - 1 hour",
    category: "gift_card",
    requiredFields: ["giftCardEmail"],
  },
  STEAM_GIFT: {
    name: "Steam Gift Card",
    minHoney: 5000, // $5.00
    maxHoney: 50000, // $50.00
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "Instant - 1 hour",
    category: "gift_card",
    requiredFields: ["giftCardEmail"],
  },
  ROBLOX: {
    name: "Roblox Gift Card",
    minHoney: 5000, // $5.00
    maxHoney: 25000, // $25.00
    feeUsd: 0,
    feePercent: 0,
    enabled: true,
    estimatedTime: "Instant - 1 hour",
    category: "gift_card",
    requiredFields: ["giftCardEmail"],
  },
  VISA: {
    name: "Visa Prepaid Card",
    minHoney: 10000, // $10.00
    maxHoney: 200000, // $200.00
    feeUsd: 1.0,
    feePercent: 0,
    enabled: false, // Coming soon
    estimatedTime: "3-5 business days",
    category: "fiat",
    requiredFields: ["paypalEmail"], // Uses email for virtual card delivery
  },
};

/**
 * Convert Honey to USD.
 */
export function honeyToUsd(honey: number): number {
  return honey / 1000;
}

/**
 * Convert USD to Honey.
 */
export function usdToHoney(usd: number): number {
  return Math.floor(usd * 1000);
}

/**
 * Calculate the fee for a withdrawal in USD.
 */
export function calculateFeeUsd(
  method: string,
  amountHoney: number
): number {
  const config = WITHDRAWAL_METHODS[method];
  if (!config) return 0;

  const amountUsd = honeyToUsd(amountHoney);
  const percentFee = amountUsd * (config.feePercent / 100);
  return Math.round((config.feeUsd + percentFee) * 100) / 100;
}

/**
 * Daily withdrawal limit in Honey (per user).
 * Helps prevent abuse if an account is compromised.
 */
export const DAILY_WITHDRAWAL_LIMIT_HONEY = 500000; // $500.00

/**
 * Maximum pending withdrawals per user.
 * Prevents spam withdrawal requests.
 */
export const MAX_PENDING_WITHDRAWALS = 3;
