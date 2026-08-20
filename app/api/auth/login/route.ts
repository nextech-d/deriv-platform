import { NextRequest, NextResponse } from "next/server";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from "@/lib/auth/pkce";
import { assertDerivConfig, derivConfig, getAppRedirectUri } from "@/lib/config/deriv";

const PKCE_COOKIE = "deriv_pkce_verifier";
const STATE_COOKIE = "deriv_oauth_state";

export async function GET(request: NextRequest) {
  try {
    assertDerivConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configuration error" },
      { status: 500 },
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateOAuthState();
  const redirectUri = getAppRedirectUri(request.nextUrl.origin);

  const params = new URLSearchParams({
    scope: derivConfig.oauthScopes,
    response_type: "code",
    client_id: derivConfig.oauthClientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  if (derivConfig.affiliateToken) {
    params.set("affiliate_token", derivConfig.affiliateToken);
  }
  if (derivConfig.utmCampaign) {
    params.set("utm_campaign", derivConfig.utmCampaign);
  }

  const authorizeUrl = `${derivConfig.oauthAuthorizeUrl}?${params.toString()}`;
  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set(PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
