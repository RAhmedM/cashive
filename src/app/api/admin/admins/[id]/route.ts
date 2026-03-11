/**
 * Admin User Detail/Update API
 *
 * PATCH  - Update admin (name, role, isActive)
 * DELETE - Deactivate admin (soft delete)
 */
import { db } from "@/lib/db";
import { withAdmin, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import {
  createAuditLog,
  hashAdminPassword,
  destroyAllAdminSessions,
} from "@/lib/admin-auth";
import { updateAdminSchema } from "@/lib/validations/admin";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const PATCH = withAdmin(async (request, admin, params) => {
  const id = params?.id;
  if (!id) return jsonError("Missing admin ID", 400);

  // Prevent editing yourself through this endpoint
  if (id === admin.id) {
    return jsonError("Cannot modify your own account through admin management", 400);
  }

  const target = await db.adminUser.findUnique({ where: { id } });
  if (!target) return jsonError("Admin not found", 404);

  // Cannot edit SUPER_ADMIN unless you are SUPER_ADMIN (which is already enforced by withAdmin)
  if (target.role === "SUPER_ADMIN") {
    return jsonError("Cannot modify a SUPER_ADMIN account", 403);
  }

  // Try update schema first, then reset password schema
  const body = await request.clone().json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  // Password reset flow
  if (body.newPassword !== undefined) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid password", 400);
    }
    const passwordHash = await hashAdminPassword(parsed.data.newPassword);
    await db.adminUser.update({
      where: { id },
      data: { passwordHash },
    });

    // Force logout the target admin
    await destroyAllAdminSessions(id);

    createAuditLog({
      adminId: admin.id,
      action: "admin.resetPassword",
      targetType: "AdminUser",
      targetId: id,
      afterState: { passwordReset: true } as unknown as Prisma.InputJsonValue,
    }).catch(() => {});

    return jsonOk({ success: true, action: "passwordReset" });
  }

  // Standard update flow
  const { data, error } = await parseBody(
    new Request(request.url, {
      method: "PATCH",
      headers: request.headers,
      body: JSON.stringify(body),
    }),
    updateAdminSchema
  );
  if (error) return error;

  const beforeState: Record<string, string | boolean> = {};
  const afterState: Record<string, string | boolean> = {};
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined && data.name !== target.name) {
    beforeState.name = target.name;
    afterState.name = data.name;
    updateData.name = data.name;
  }

  if (data.role !== undefined && data.role !== target.role) {
    beforeState.role = target.role;
    afterState.role = data.role;
    updateData.role = data.role;
  }

  if (data.isActive !== undefined && data.isActive !== target.isActive) {
    beforeState.isActive = target.isActive;
    afterState.isActive = data.isActive;
    updateData.isActive = data.isActive;

    // If deactivating, force logout
    if (!data.isActive) {
      await destroyAllAdminSessions(id);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError("No changes provided", 400);
  }

  const updated = await db.adminUser.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      totpEnabled: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  createAuditLog({
    adminId: admin.id,
    action: "admin.update",
    targetType: "AdminUser",
    targetId: id,
    beforeState: beforeState as unknown as Prisma.InputJsonValue,
    afterState: afterState as unknown as Prisma.InputJsonValue,
  }).catch(() => {});

  return jsonOk({ admin: updated });
}, "SUPER_ADMIN");

export const dynamic = "force-dynamic";
