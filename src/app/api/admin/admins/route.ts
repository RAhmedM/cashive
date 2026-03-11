/**
 * Admin Management API
 *
 * GET  - List all admin users (SUPER_ADMIN only)
 * POST - Create a new admin user (SUPER_ADMIN only)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { createAuditLog, hashAdminPassword } from "@/lib/admin-auth";
import { createAdminSchema } from "@/lib/validations/admin";
import type { Prisma } from "@/generated/prisma";

export const GET = withAdmin(async () => {
  const admins = await db.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      totpEnabled: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: { auditLogs: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  return jsonOk({ admins });
}, "SUPER_ADMIN");

export const POST = withAdmin(async (request, admin) => {
  const { data, error } = await parseBody(request, createAdminSchema);
  if (error) return error;

  // Check if email already exists
  const existing = await db.adminUser.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return jsonError("An admin with this email already exists", 409);
  }

  const passwordHash = await hashAdminPassword(data.password);

  const newAdmin = await db.adminUser.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  createAuditLog({
    adminId: admin.id,
    action: "admin.create",
    targetType: "AdminUser",
    targetId: newAdmin.id,
    afterState: {
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
    } as unknown as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ admin: newAdmin }, 201);
}, "SUPER_ADMIN");

export const dynamic = "force-dynamic";
