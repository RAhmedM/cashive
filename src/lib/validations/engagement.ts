/**
 * Zod validation schemas for Phase 4 engagement endpoints.
 * Covers races, promo codes, and notifications.
 */
import { z } from "zod";

// ---- Races ----

/**
 * Note: Race list and leaderboard query params are parsed inline
 * in the route handlers using parseSearchParams(), matching the
 * established pattern from Phases 1-3. These type definitions
 * document the expected query shapes.
 */
export type RaceListQueryParams = {
  type?: "DAILY" | "MONTHLY";
  active?: boolean;
  ended?: boolean;
  page?: number;
  limit?: number;
};

export type RaceLeaderboardQueryParams = {
  page?: number;
  limit?: number;
};

// ---- Admin Race Management ----

export const createRaceSchema = z.object({
  type: z.enum(["DAILY", "MONTHLY"]),
  title: z.string().min(1, "Title is required").max(100),
  prizePoolUsdCents: z.number().int().positive("Prize pool must be positive"),
  prizeDistribution: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        amount: z.number().positive(),
      })
    )
    .min(1, "At least one prize is required"),
  startsAt: z.string().datetime({ message: "Invalid start date" }),
  endsAt: z.string().datetime({ message: "Invalid end date" }),
});

export const updateRaceSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  prizePoolUsdCents: z.number().int().positive().optional(),
  prizeDistribution: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        amount: z.number().positive(),
      })
    )
    .min(1)
    .optional(),
  status: z.enum(["ACTIVE", "FINALIZING", "COMPLETED"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

// ---- Promo Codes (admin) ----

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50)
    .transform((v) => v.toUpperCase().trim()),
  rewardHoney: z
    .number()
    .int()
    .positive("Reward must be a positive integer"),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updatePromoCodeSchema = z.object({
  rewardHoney: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ---- Notifications ----

export const markNotificationsSchema = z.union([
  z.object({
    all: z.literal(true),
  }),
  z.object({
    ids: z
      .array(z.string().min(1))
      .min(1, "At least one notification ID is required")
      .max(100, "Cannot mark more than 100 notifications at once"),
  }),
]);

export const deleteNotificationSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "At least one notification ID is required")
    .max(100, "Cannot delete more than 100 notifications at once")
    .optional(),
  all: z.boolean().optional(),
});

// ---- Type exports ----

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type MarkNotificationsInput = z.infer<typeof markNotificationsSchema>;
export type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>;
