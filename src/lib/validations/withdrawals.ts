/**
 * Zod validation schemas for withdrawal endpoints.
 */
import { z } from "zod";

// All valid withdrawal methods (matching Prisma enum)
const withdrawalMethods = [
  "PAYPAL",
  "BITCOIN",
  "ETHEREUM",
  "LITECOIN",
  "SOLANA",
  "AMAZON_GIFT",
  "STEAM_GIFT",
  "ROBLOX",
  "VISA",
] as const;

// ============================================================================
// User-facing schemas
// ============================================================================

export const createWithdrawalSchema = z
  .object({
    method: z.enum(withdrawalMethods, {
      error: "Invalid withdrawal method",
    }),
    amountHoney: z
      .number()
      .int("Amount must be a whole number of Honey")
      .min(1, "Amount must be positive"),
    // PayPal
    paypalEmail: z
      .string()
      .email("Must be a valid email address")
      .optional(),
    // Crypto
    cryptoAddress: z
      .string()
      .min(10, "Crypto address is too short")
      .max(128, "Crypto address is too long")
      .optional(),
    // Gift cards
    giftCardEmail: z
      .string()
      .email("Must be a valid email address")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validate that required fields are present based on method
    if (data.method === "PAYPAL" && !data.paypalEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PayPal email is required for PayPal withdrawals",
        path: ["paypalEmail"],
      });
    }

    const cryptoMethods = ["BITCOIN", "ETHEREUM", "LITECOIN", "SOLANA"];
    if (cryptoMethods.includes(data.method) && !data.cryptoAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Crypto address is required for cryptocurrency withdrawals",
        path: ["cryptoAddress"],
      });
    }

    const giftMethods = ["AMAZON_GIFT", "STEAM_GIFT", "ROBLOX"];
    if (giftMethods.includes(data.method) && !data.giftCardEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for gift card delivery",
        path: ["giftCardEmail"],
      });
    }

    if (data.method === "VISA" && !data.paypalEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required for Visa card delivery",
        path: ["paypalEmail"],
      });
    }
  });

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;

// ============================================================================
// Admin-facing schemas
// ============================================================================

export const reviewWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject"], {
    error: "Action must be 'approve' or 'reject'",
  }),
  reviewNote: z
    .string()
    .max(500, "Review note must be at most 500 characters")
    .optional(),
});

export type ReviewWithdrawalInput = z.infer<typeof reviewWithdrawalSchema>;

export const processWithdrawalSchema = z.object({
  externalTxId: z
    .string()
    .min(1, "External transaction ID is required")
    .max(256, "External transaction ID is too long")
    .optional(),
});

export type ProcessWithdrawalInput = z.infer<typeof processWithdrawalSchema>;
