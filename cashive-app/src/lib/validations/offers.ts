/**
 * Zod validation schemas for offerwall provider and featured offer endpoints.
 */
import { z } from "zod";

// ============================================================================
// OfferwallProvider schemas (admin CRUD)
// ============================================================================

export const createProviderSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  postbackSecret: z
    .string()
    .min(8, "Postback secret must be at least 8 characters"),
  postbackIps: z
    .array(
      z
        .string()
        .regex(
          /^(\d{1,3}\.){3}\d{1,3}$/,
          "Each entry must be a valid IPv4 address"
        )
    )
    .default([]),
  bonusPercent: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  isSurveyWall: z.boolean().default(false),
  isWatchWall: z.boolean().default(false),
  iframeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  revenueSharePercent: z.number().int().min(1).max(100).default(80),
});

export const updateProviderSchema = createProviderSchema.partial();

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;

// ============================================================================
// FeaturedOffer schemas (admin CRUD)
// ============================================================================

export const createFeaturedOfferSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  requirement: z
    .string()
    .min(1, "Requirement is required")
    .max(500, "Requirement must be at most 500 characters"),
  provider: z
    .string()
    .min(1, "Provider is required")
    .max(100, "Provider must be at most 100 characters"),
  providerLogoUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  posterImageUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  appIconUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  rewardHoney: z
    .number()
    .int("Reward must be a whole number")
    .min(1, "Reward must be at least 1 Honey"),
  rewardUsd: z
    .number()
    .min(0, "Reward USD must be non-negative"),
  externalUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category must be at most 50 characters"),
  completions: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateFeaturedOfferSchema = createFeaturedOfferSchema.partial();

export type CreateFeaturedOfferInput = z.infer<typeof createFeaturedOfferSchema>;
export type UpdateFeaturedOfferInput = z.infer<typeof updateFeaturedOfferSchema>;
