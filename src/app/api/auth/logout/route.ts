/**
 * POST /api/auth/logout
 *
 * Destroy the current session and clear the session cookie.
 */
import { destroyCurrentSession } from "@/lib/auth";
import { jsonOk } from "@/lib/middleware";

export async function POST() {
  await destroyCurrentSession();
  return jsonOk({ message: "Logged out successfully" });
}
