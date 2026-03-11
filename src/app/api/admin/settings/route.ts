/**
 * Admin Platform Settings API
 *
 * GET  - List all settings grouped by category
 * PUT  - Update a setting by key
 * POST - Create a new setting (rare, usually seeded)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createAuditLog } from "@/lib/admin-auth";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const createSettingSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, "Key must start with a letter and contain only letters, numbers, dots, and underscores"),
  value: z.string(),
  type: z.enum(["STRING", "INT", "FLOAT", "BOOLEAN", "JSON"]),
  category: z.enum(["GENERAL", "WITHDRAWALS", "RACES", "STREAKS", "VIP", "REFERRALS"]),
  description: z.string().min(1).max(500),
});

export const GET = withAdmin(async () => {
  const settings = await db.platformSetting.findMany({
    include: {
      admin: { select: { id: true, name: true } },
    },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  // Group by category
  const grouped: Record<string, typeof settings> = {};
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return jsonOk({ settings, grouped });
}, "SUPER_ADMIN");

export const PUT = withAdmin(async (request, admin) => {
  const { data, error } = await parseBody(request, updateSettingSchema);
  if (error) return error;

  const existing = await db.platformSetting.findUnique({
    where: { key: data.key },
  });
  if (!existing) return jsonError("Setting not found", 404);

  // Validate value against type
  const validation = validateSettingValue(data.value, existing.type);
  if (validation) return jsonError(validation, 400);

  const updated = await db.platformSetting.update({
    where: { key: data.key },
    data: {
      value: data.value,
      updatedAt: new Date(),
      updatedBy: admin.id,
    },
  });

  createAuditLog({
    adminId: admin.id,
    action: "settings.update",
    targetType: "PlatformSetting",
    targetId: data.key,
    beforeState: { value: existing.value } as unknown as Prisma.InputJsonValue,
    afterState: { value: data.value } as unknown as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ setting: updated });
}, "SUPER_ADMIN");

export const POST = withAdmin(async (request, admin) => {
  const { data, error } = await parseBody(request, createSettingSchema);
  if (error) return error;

  // Check if key already exists
  const existing = await db.platformSetting.findUnique({
    where: { key: data.key },
  });
  if (existing) return jsonError("Setting with this key already exists", 409);

  // Validate value against type
  const validation = validateSettingValue(data.value, data.type);
  if (validation) return jsonError(validation, 400);

  const setting = await db.platformSetting.create({
    data: {
      key: data.key,
      value: data.value,
      type: data.type,
      category: data.category,
      description: data.description,
      updatedBy: admin.id,
    },
  });

  createAuditLog({
    adminId: admin.id,
    action: "settings.create",
    targetType: "PlatformSetting",
    targetId: data.key,
    afterState: {
      value: data.value,
      type: data.type,
      category: data.category,
    } as unknown as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ setting }, 201);
}, "SUPER_ADMIN");

function validateSettingValue(value: string, type: string): string | null {
  switch (type) {
    case "INT":
      if (!/^-?\d+$/.test(value)) return "Value must be a valid integer";
      break;
    case "FLOAT":
      if (!/^-?\d+(\.\d+)?$/.test(value)) return "Value must be a valid number";
      break;
    case "BOOLEAN":
      if (value !== "true" && value !== "false") return "Value must be 'true' or 'false'";
      break;
    case "JSON":
      try { JSON.parse(value); } catch { return "Value must be valid JSON"; }
      break;
  }
  return null;
}

export const dynamic = "force-dynamic";
