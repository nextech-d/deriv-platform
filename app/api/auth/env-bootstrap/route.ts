import { NextRequest, NextResponse } from "next/server";
import { applyCsrfCookie } from "@/lib/auth/csrf";
import { establishSessionFromToken } from "@/lib/auth/session-from-token";
import { derivConfig } from "@/lib/config/deriv";
import { getSessionOrDefault } from "@/lib/session";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const existing = await getSessionOrDefault();

  if (existing.isLoggedIn) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const token = derivConfig.serverApiToken.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { csrfToken } = await establishSessionFromToken({ accessToken: token });
    const response = NextResponse.redirect(new URL(next, request.url));
    applyCsrfCookie(response, csrfToken);
    return response;
  } catch (error) {
    console.error("[auth] DERIV_API_TOKEN bootstrap failed:", error);
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "env_token_invalid");
    return NextResponse.redirect(login);
  }
}
