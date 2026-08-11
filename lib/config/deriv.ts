const DERIV_REST_BASE = "https://api.derivws.com";
const DERIV_OAUTH_BASE = "https://auth.deriv.com/oauth2";

export const derivConfig = {
  appId: process.env.NEXT_PUBLIC_DERIV_APP_ID ?? "",
  /** Server-only PAT for local dev when OAuth is unreachable */
  serverApiToken: process.env.DERIV_API_TOKEN ?? "",
  oauthClientId:
    process.env.DERIV_OAUTH_CLIENT_ID ??
    process.env.NEXT_PUBLIC_DERIV_APP_ID ??
    "",
  affiliateToken: process.env.NEXT_PUBLIC_DERIV_AFFILIATE_TOKEN ?? "",
  utmCampaign: process.env.NEXT_PUBLIC_DERIV_UTM_CAMPAIGN ?? "deriv_platform_ea",
  restBaseUrl: DERIV_REST_BASE,
  oauthBaseUrl: DERIV_OAUTH_BASE,
  oauthAuthorizeUrl: `${DERIV_OAUTH_BASE}/auth`,
  oauthTokenUrl: `${DERIV_OAUTH_BASE}/token`,
  tradeMarkupPercent: 0.5,
  publicWsUrl: "wss://api.derivws.com/trading/v1/options/ws/public",
} as const;

export function assertDerivConfig() {
  if (!derivConfig.appId) {
    throw new Error("NEXT_PUBLIC_DERIV_APP_ID is not configured");
  }
  if (!derivConfig.oauthClientId) {
    throw new Error("DERIV_OAUTH_CLIENT_ID or NEXT_PUBLIC_DERIV_APP_ID is required");
  }
}

export function getAppRedirectUri(origin: string) {
  return `${origin}/api/auth/callback`;
}
