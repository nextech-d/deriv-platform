import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/deriv/api";
import { applyCsrfCookie } from "@/lib/auth/csrf";
import { establishSessionFromToken } from "@/lib/auth/session-from-token";
import { getAppRedirectUri } from "@/lib/config/deriv";
import { AUTH_DASHBOARD_PATH } from "@/lib/auth/auth-links";

const PKCE_COOKIE = "deriv_pkce_verifier";
const STATE_COOKIE = "deriv_oauth_state";

export type InboundAuth =
  | { kind: "oauth_code"; code: string; state: string }
  | { kind: "legacy_token"; token: string }
  | { kind: "verify"; token: string }
  | { kind: "oauth_error"; error: string }
  | { kind: "empty" };

export function parseInboundAuth(url: URL): InboundAuth {
  const error = url.searchParams.get("error")?.trim();
  if (error) return { kind: "oauth_error", error };

  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  if (code && state) return { kind: "oauth_code", code, state };

  const token1 = url.searchParams.get("token1")?.trim();
  if (token1 && token1.length >= 16) {
    return { kind: "legacy_token", token: token1 };
  }

  const verifyToken =
    url.searchParams.get("token")?.trim() ||
    url.searchParams.get("verification_code")?.trim() ||
    url.searchParams.get("email_code")?.trim();
  if (verifyToken && verifyToken.length >= 8) {
    return { kind: "verify", token: verifyToken };
  }

  return { kind: "empty" };
}

function loginRedirect(request: NextRequest, params: Record<string, string>) {
  const login = new URL("/login", request.url);
  for (const [key, value] of Object.entries(params)) {
    login.searchParams.set(key, value);
  }
  return NextResponse.redirect(login);
}

function withClearedPkce(response: NextResponse) {
  response.cookies.delete(PKCE_COOKIE);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

function dashboardRedirect(request: NextRequest, csrfToken: string) {
  const response = NextResponse.redirect(new URL(AUTH_DASHBOARD_PATH, request.url));
  applyCsrfCookie(response, csrfToken);
  return withClearedPkce(response);
}

/**
 * Completes Deriv return traffic on OAuth callback, Verification URL, or /verify.
 * Handles PKCE `code`, legacy `token1`, and email-verification tokens.
 */
export async function handleInboundAuth(
  request: NextRequest,
): Promise<NextResponse> {
  const inbound = parseInboundAuth(request.nextUrl);

  if (inbound.kind === "oauth_error") {
    return withClearedPkce(
      loginRedirect(request, { error: inbound.error }),
    );
  }

  if (inbound.kind === "oauth_code") {
    const storedState = request.cookies.get(STATE_COOKIE)?.value;
    const codeVerifier = request.cookies.get(PKCE_COOKIE)?.value;

    if (!storedState || storedState !== inbound.state) {
      return withClearedPkce(
        loginRedirect(request, { error: "invalid_state" }),
      );
    }
    if (!codeVerifier) {
      return withClearedPkce(
        loginRedirect(request, { error: "missing_verifier" }),
      );
    }

    const redirectUri = getAppRedirectUri(request.nextUrl.origin);
    const tokenResponse = await exchangeCodeForToken(
      inbound.code,
      codeVerifier,
      redirectUri,
    );

    if (tokenResponse.error || !tokenResponse.access_token) {
      const description =
        tokenResponse.error_description ??
        tokenResponse.error ??
        "token_exchange_failed";
      return withClearedPkce(
        loginRedirect(request, { error: description }),
      );
    }

    const { csrfToken } = await establishSessionFromToken({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
    });

    return dashboardRedirect(request, csrfToken);
  }

  if (inbound.kind === "legacy_token") {
    try {
      const { csrfToken } = await establishSessionFromToken({
        accessToken: inbound.token,
      });
      return dashboardRedirect(request, csrfToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "token_rejected";
      return withClearedPkce(loginRedirect(request, { error: message }));
    }
  }

  if (inbound.kind === "verify") {
    try {
      const { csrfToken } = await establishSessionFromToken({
        accessToken: inbound.token,
      });
      return dashboardRedirect(request, csrfToken);
    } catch {
      return withClearedPkce(
        loginRedirect(request, { verified: "1" }),
      );
    }
  }

  return withClearedPkce(loginRedirect(request, { error: "missing_code" }));
}
