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
  anonymousOnLeaderboard: z.boolean().optional(),
  // Display
  balanceDisplay: z.enum(["HONEY", "USD", "BOTH"]).optional(),
  chatOpenDefault: z.boolean().optional(),
  // Notifications (stored as single JSON field `notificationPrefs` in DB)
  notificationPrefs: z
    .object({
      email: z
        .object({
          marketing: z.boolean().optional(),
          withdrawal: z.boolean().optional(),
          offer_credited: z.boolean().optional(),
          weekly_summary: z.boolean().optional(),
        })
        .optional(),
      push: z.record(z.string(), z.boolean()).optional(),
      onsite: z
        .object({
          race_results: z.boolean().optional(),
          streak_reminder: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const updateSurveyProfileSchema = z.object({
  age: z.number().int().min(18, "Must be at least 18").max(120).optional().nullable(),
  gender: z
    .enum(["male", "female", "non_binary", "prefer_not_to_say"])
    .optional()
    .nullable(),
  education: z
    .enum(["high_school", "some_college", "bachelors", "masters", "doctorate", "other"])
    .optional()
    .nullable(),
  employmentStatus: z
    .enum(["employed_full", "employed_part", "self_employed", "unemployed", "student", "retired"])
    .optional()
    .nullable(),
  incomeRange: z
    .enum(["under_25k", "25k_50k", "50k_75k", "75k_100k", "100k_150k", "over_150k", "prefer_not_to_say"])
    .optional()
    .nullable(),
  householdSize: z.number().int().min(1).max(20).optional().nullable(),
  hasChildren: z.boolean().optional().nullable(),
  maritalStatus: z
    .enum(["single", "married", "divorced", "widowed", "prefer_not_to_say"])
    .optional()
    .nullable(),
  industry: z.string().max(100).optional().nullable(),
  interests: z.array(z.string().max(50)).max(20).optional(),
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
