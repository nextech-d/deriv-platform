import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "deriv_platform_session";
const CSRF_COOKIE = "deriv_csrf";
const CSRF_HEADER = "x-csrf-token";

/** Reachable without a Deriv session. Admin still requires Bearer ADMIN_SECRET in the route. */
const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/verify",
  "/api/auth/status",
  "/api/auth/pat",
  "/api/auth/env-bootstrap",
  "/api/admin",
  "/api/copy/providers",
  "/api/fx/rates",
  "/api/payments/agents",
  "/api/monitoring/report",
];

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/admin") &&
    MUTATING_METHODS.has(request.method)
  ) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
