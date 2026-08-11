import type { DerivAccount } from "@/lib/session/types";

/**
 * When false, dashboard requires OAuth/PAT session and worker uses real OTP trading.
 * Set NEXT_PUBLIC_DEMO_MODE=false in .env.local for live trading.
 */
export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const DEMO_ACCOUNTS: DerivAccount[] = [
  {
    accountId: "demo",
    loginid: "VRT1000000",
    currency: "USD",
    isDemo: true,
  },
];

export const DEMO_BALANCE = {
  amount: 10_000,
  currency: "USD",
};

export const PUBLIC_WS_URL =
  "wss://api.derivws.com/trading/v1/options/ws/public";

/** Prefer new DerivWS public endpoint — legacy v3 often blocked from EA IPs */
export function getPublicWsUrl(_appId: string): string {
  return PUBLIC_WS_URL;
}
