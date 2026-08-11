import { NextRequest, NextResponse } from "next/server";
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
    await establishSessionFromToken({ accessToken: token });
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error("[auth] DERIV_API_TOKEN bootstrap failed:", error);
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "env_token_invalid");
    return NextResponse.redirect(login);
  }
}
