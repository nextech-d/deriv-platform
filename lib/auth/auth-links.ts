export const AUTH_LOGIN_PATH = "/login";
export const AUTH_OAUTH_PATH = "/api/auth/login";
export const AUTH_DASHBOARD_PATH = "/dashboard";

/** Deriv OAuth and TradersHub leave this origin — keep TradeCity open. */
export const DERIV_EXTERNAL_LINK = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

const DERIV_SIGNUP_BASE = "https://hub.deriv.com/tradershub/signup";

function isAllowedSignupUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname;
    return (
      host === "deriv.com" ||
      host === "hub.deriv.com" ||
      host === "track.deriv.com" ||
      host.endsWith(".deriv.com")
    );
  } catch {
    return false;
  }
}

/**
 * Sign up leaves TradeCity for Deriv. Prefer a full partner signup URL
 * (`NEXT_PUBLIC_DERIV_SIGNUP_URL`); otherwise build TradersHub with `t=`.
 * Log in uses the same owner’s App ID and affiliate token.
 */
export function getDerivSignupUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_DERIV_SIGNUP_URL?.trim();
  if (explicit && isAllowedSignupUrl(explicit)) return explicit;

  const params = new URLSearchParams();
  const token = process.env.NEXT_PUBLIC_DERIV_AFFILIATE_TOKEN?.trim();
  const campaign =
    process.env.NEXT_PUBLIC_DERIV_UTM_CAMPAIGN ?? "deriv_platform_ea";

  if (token) params.set("t", token);
  if (campaign) params.set("utm_campaign", campaign);

  const query = params.toString();
  return query ? `${DERIV_SIGNUP_BASE}?${query}` : DERIV_SIGNUP_BASE;
}
