/**
 * GET /api/health
 *
 * Health check endpoint. Verifies database and Redis connectivity.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    database: "error",
    redis: "error",
  };

  // Check Postgres
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err) {
    console.error("[Health] Database check failed:", err);
  }

  // Check Redis
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      checks.redis = "ok";
    }
  } catch (err) {
    console.error("[Health] Redis check failed:", err);
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
