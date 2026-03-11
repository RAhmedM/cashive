import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware — Route protection.
 *
 * Handles two separate auth flows:
 * 1. User auth: `cashive_session` cookie for user-facing pages
 * 2. Admin auth: `cashive_admin_session` cookie for /admin/* pages
 *
 * Note: This only checks cookie *presence*. The actual session validation
 * happens server-side in the API routes via `withAuth` / `withAdmin`.
 */

const PUBLIC_PATHS = new Set(["/login", "/register"]);

const PUBLIC_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon",
  "/icon",
  "/apple-touch-icon",
  "/manifest",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static assets, and Next.js internals
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // ── Admin routes ──────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const hasAdminSession = request.cookies.has("cashive_admin_session");

    // Admin login page is public (for admins)
    if (pathname === "/admin/login") {
      // Already logged in? Redirect to admin dashboard
      if (hasAdminSession) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    // All other admin pages require admin session
    if (!hasAdminSession) {
      const loginUrl = new URL("/admin/login", request.url);
      if (pathname !== "/admin") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── User routes ───────────────────────────────────────────────
  const hasSession = request.cookies.has("cashive_session");

  // Authenticated user trying to access auth pages → redirect to dashboard
  if (hasSession && PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user trying to access protected pages → redirect to login
  if (!hasSession && !PUBLIC_PATHS.has(pathname)) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the intended destination so we can redirect after login
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon.*, apple-touch-icon.* (browser icons)
     * - *.svg, *.png, *.jpg, *.webp (public images)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
