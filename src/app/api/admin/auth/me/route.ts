/**
 * GET /api/admin/auth/me
 *
 * Returns the currently authenticated admin user.
 */
import { withAdmin, jsonOk } from "@/lib/middleware";

export const GET = withAdmin(async (_request, admin) => {
  return jsonOk({
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      totpEnabled: admin.totpEnabled,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    },
  });
});
