/**
 * Prisma client singleton.
 *
 * Prisma v7 uses a driver-adapter pattern. We use @prisma/adapter-pg
 * with the `pg` Pool to connect to PostgreSQL.
 *
 * In development, Next.js hot-reloads clear the module cache, which would
 * create a new PrismaClient on every reload and exhaust database connections.
 * We store the client on `globalThis` to reuse it across reloads.
 */
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://user:password@localhost:5432/cashive";

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
