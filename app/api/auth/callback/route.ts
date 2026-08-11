import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/deriv/api";
import { establishSessionFromToken } from "@/lib/auth/session-from-token";
import { getAppRedirectUri } from "@/lib/config/deriv";

const PKCE_COOKIE = "deriv_pkce_verifier";
const STATE_COOKIE = "deriv_oauth_state";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const storedState = request.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(PKCE_COOKIE)?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  if (!codeVerifier) {
    return NextResponse.redirect(new URL("/login?error=missing_verifier", request.url));
  }

  const redirectUri = getAppRedirectUri(url.origin);
  const tokenResponse = await exchangeCodeForToken(code, codeVerifier, redirectUri);

  if (tokenResponse.error || !tokenResponse.access_token) {
    const description = tokenResponse.error_description ?? tokenResponse.error ?? "token_exchange_failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(description)}`, request.url),
    );
  }

  await establishSessionFromToken({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
  });

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.delete(PKCE_COOKIE);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
