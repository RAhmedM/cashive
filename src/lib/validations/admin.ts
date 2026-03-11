/**
 * Zod validation schemas for admin auth API routes.
 */
import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().length(6).optional(),
});

export const createAdminSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  role: z.enum(["ADMIN", "MODERATOR", "SUPPORT_AGENT"]),
});

export const updateAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "MODERATOR", "SUPPORT_AGENT"]).optional(),
  isActive: z.boolean().optional(),
});

// Type exports
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
