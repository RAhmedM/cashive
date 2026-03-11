/**
 * API middleware utilities.
 *
 * Provides withAuth, withAdmin, rate limiting, and standard JSON responses.
 */
import { NextResponse } from "next/server";
import { getSessionUser, getClientIp } from "./auth";
import { checkRateLimit } from "./redis";
import type { User } from "@/generated/prisma";

// ---- Standard API Responses ----

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(
  message: string,
  status = 400,
  errors?: Record<string, string[]>
): NextResponse {
  return NextResponse.json({ error: message, errors }, { status });
}

// ---- Auth Wrappers ----

type AuthenticatedUser = User & { sessionId: string };

type AuthHandler = (
  request: Request,
  user: AuthenticatedUser,
  params?: Record<string, string>
) => Promise<NextResponse>;

/**
 * Wraps a route handler to require authentication.
 * Automatically returns 401 if no valid session.
 */
export function withAuth(handler: AuthHandler) {
  return async (
    request: Request,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const user = await getSessionUser();
    if (!user) {
      return jsonError("Authentication required", 401);
    }

    const params = context?.params ? await context.params : undefined;
    return handler(request, user, params);
  };
}

/**
 * Wraps a route handler to require admin authentication.
 * Uses separate admin auth (AdminUser model) — placeholder for now,
 * falls back to checking if user email matches admin list.
 */
export function withAdmin(handler: AuthHandler) {
  return withAuth(async (request, user, params) => {
    // For Phase 1, check a simple env-based admin list.
    // Phase 7 will implement proper AdminUser authentication.
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!adminEmails.includes(user.email.toLowerCase())) {
      return jsonError("Admin access required", 403);
    }

    return handler(request, user, params);
  });
}

// ---- Rate Limiting Middleware ----

interface RateLimitConfig {
  /** Max requests in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  prefix: string;
  /** Use user ID (auth'd) or IP for the key */
  keyBy?: "ip" | "user";
}

/**
 * Rate limit a request. Returns null if allowed, or a 429 response if blocked.
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const identifier =
    config.keyBy === "user" && userId ? userId : getClientIp(request);

  const key = `rl:${config.prefix}:${identifier}`;

  try {
    const result = await checkRateLimit(key, config.limit, config.windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(result.resetMs / 1000)),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  } catch {
    // If Redis is down, allow the request (fail open for rate limiting)
    console.warn("[RateLimit] Redis unavailable, allowing request");
  }

  return null;
}

// ---- Pre-configured Rate Limiters ----

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 60_000, prefix: "login" } as RateLimitConfig,
  register: {
    limit: 3,
    windowMs: 60_000,
    prefix: "register",
  } as RateLimitConfig,
  forgotPassword: {
    limit: 3,
    windowMs: 300_000,
    prefix: "forgot-pw",
  } as RateLimitConfig,
  withdrawal: {
    limit: 3,
    windowMs: 3_600_000,
    prefix: "withdraw",
    keyBy: "user",
  } as RateLimitConfig,
  chat: {
    limit: 10,
    windowMs: 60_000,
    prefix: "chat",
    keyBy: "user",
  } as RateLimitConfig,
  api: {
    limit: 60,
    windowMs: 60_000,
    prefix: "api",
  } as RateLimitConfig,
} as const;

// ---- Request Parsing Helpers ----

/**
 * Safely parse JSON body with Zod validation.
 */
export async function parseBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      data: null,
      error: jsonError("Invalid JSON body", 400),
    };
  }

  try {
    const data = schema.parse(body);
    return { data, error: null };
  } catch (err) {
    if (err && typeof err === "object" && "errors" in err) {
      const zodErrors = err as { errors: Array<{ path: (string | number)[]; message: string }> };
      const fieldErrors: Record<string, string[]> = {};
      for (const e of zodErrors.errors) {
        const field = e.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(e.message);
      }
      return {
        data: null,
        error: jsonError("Validation failed", 400, fieldErrors),
      };
    }
    return {
      data: null,
      error: jsonError("Invalid request data", 400),
    };
  }
}

/**
 * Parse URL search params into a typed object.
 */
export function parseSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}
