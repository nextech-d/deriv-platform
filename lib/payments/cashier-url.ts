import { derivConfig } from "@/lib/config/deriv";

export type CashierLinkMode = "authenticated" | "web" | "demo";

export interface CashierLink {
  url: string;
  mode: CashierLinkMode;
  notice?: string;
}

export interface BuildCashierUrlInput {
  returnUrl: string;
  accessToken?: string;
  loginid?: string;
  demoMode?: boolean;
}

const WEB_CASHIER_URL = "https://deriv.com/account/cashier";

function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  );
}

/** Localhost return URLs trigger Deriv WAF — use HTTPS fallback or env override. */
export function resolveCashierReturnUrl(returnUrl: string): string {
  const override = process.env.DERIV_CASHIER_REDIRECT_URL?.trim();
  if (override) {
    try {
      const parsed = new URL(override);
      if (parsed.protocol === "https:") return override;
    } catch {
      /* ignore invalid override */
    }
  }

  try {
    const parsed = new URL(returnUrl);
    if (isLocalhostHostname(parsed.hostname)) {
      return WEB_CASHIER_URL;
    }
    if (parsed.protocol !== "https:") {
      return WEB_CASHIER_URL;
    }
    return returnUrl;
  } catch {
    return WEB_CASHIER_URL;
  }
}

export function buildCashierLink(input: BuildCashierUrlInput): CashierLink {
  const { returnUrl, accessToken, loginid, demoMode = false } = input;
  const appId = derivConfig.appId.trim();
  const safeReturnUrl = resolveCashierReturnUrl(returnUrl);
  const onLocalhost = safeReturnUrl !== returnUrl;

  if (demoMode) {
    return {
      url: WEB_CASHIER_URL,
      mode: "demo",
      notice:
        "Demo mode — sign in on Deriv.com to deposit. Cashier cannot return to localhost.",
    };
  }

  if (!accessToken || !loginid || !appId) {
    return {
      url: WEB_CASHIER_URL,
      mode: "web",
      notice: "Sign in with Deriv OAuth or open Cashier on Deriv.com.",
    };
  }

  const params = new URLSearchParams({
    app_id: appId,
    token: accessToken,
    loginid,
    redirect_url: safeReturnUrl,
  });

  const notice = onLocalhost
    ? "Local dev — after deposit you will land on Deriv.com (localhost redirects are blocked by Deriv security)."
    : undefined;

  return {
    url: `https://cashier.deriv.com/?${params.toString()}`,
    mode: "authenticated",
    notice,
  };
}

/** @deprecated Use buildCashierLink or GET /api/payments/cashier-url */
export function buildCashierUrl(returnUrl: string): string {
  return buildCashierLink({ returnUrl }).url;
}
