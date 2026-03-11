/**
 * Zod validation schemas for user-related API routes.
 */
import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .optional(),
  language: z.string().min(2).max(5).optional(),
  // Privacy
  profilePublic: z.boolean().optional(),
  anonymousInChat: z.boolean().optional(),
  anonymousOnBoard: z.boolean().optional(),
  // Display
  balanceDisplay: z.enum(["HONEY", "USD", "BOTH"]).optional(),
  chatOpenDefault: z.boolean().optional(),
  // Notifications
  notifEmail: z
    .object({
      earnings: z.boolean().optional(),
      withdrawals: z.boolean().optional(),
      promotions: z.boolean().optional(),
      weekly_summary: z.boolean().optional(),
    })
    .optional(),
  notifPush: z
    .object({
      earnings: z.boolean().optional(),
      withdrawals: z.boolean().optional(),
      streak_reminder: z.boolean().optional(),
    })
    .optional(),
  notifOnsite: z
    .object({
      earnings: z.boolean().optional(),
      withdrawals: z.boolean().optional(),
      chat_mentions: z.boolean().optional(),
      achievements: z.boolean().optional(),
    })
    .optional(),
});

export const updateSurveyProfileSchema = z.object({
  age: z.number().int().min(13).max(120).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  education: z.string().max(50).optional().nullable(),
  employment: z.string().max(50).optional().nullable(),
  income: z.string().max(50).optional().nullable(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  household: z.number().int().min(1).max(20).optional().nullable(),
  children: z.boolean().optional().nullable(),
});

export const redeemPromoSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50)
    .transform((v) => v.toUpperCase().trim()),
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSurveyProfileInput = z.infer<
  typeof updateSurveyProfileSchema
>;
export type RedeemPromoInput = z.infer<typeof redeemPromoSchema>;
