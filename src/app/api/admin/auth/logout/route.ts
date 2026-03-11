/**
 * POST /api/admin/auth/logout
 *
 * Destroy the current admin session.
 */
import { destroyAdminSession } from "@/lib/admin-auth";
import { jsonOk } from "@/lib/middleware";

export async function POST() {
  await destroyAdminSession();
  return jsonOk({ message: "Logged out" });
}
