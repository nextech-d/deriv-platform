export const AUTH_LOGIN_PATH = "/login";

const DERIV_SIGNUP_BASE = "https://hub.deriv.com/tradershub/signup";

/** Deriv TradersHub signup URL with affiliate tracking when configured. */
export function getDerivSignupUrl(): string {
  const params = new URLSearchParams();
  const token = process.env.NEXT_PUBLIC_DERIV_AFFILIATE_TOKEN;
  const campaign =
    process.env.NEXT_PUBLIC_DERIV_UTM_CAMPAIGN ?? "deriv_platform_ea";

  if (token) params.set("t", token);
  if (campaign) params.set("utm_campaign", campaign);

  const query = params.toString();
  return query ? `${DERIV_SIGNUP_BASE}?${query}` : DERIV_SIGNUP_BASE;
}
