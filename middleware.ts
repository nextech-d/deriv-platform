import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "deriv_platform_session";
const CSRF_COOKIE = "deriv_csrf";
const CSRF_HEADER = "x-csrf-token";

const PUBLIC_PATHS = new Set(["/", "/login"]);
const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/callback",
  "/_next/",
  "/favicon",
  "/assets/",
];

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    pathname.startsWith("/api/") &&
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
  matcher: [
    "/admin/:path*",
    "/api/:path*",
  ],
};
