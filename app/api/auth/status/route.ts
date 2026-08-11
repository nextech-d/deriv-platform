import { NextResponse } from "next/server";
import { derivConfig, assertDerivConfig, getAppRedirectUri } from "@/lib/config/deriv";
import { isDemoMode } from "@/lib/config/demo";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const redirectUri = getAppRedirectUri(origin);

  let configOk = false;
  let configError: string | null = null;
  try {
    assertDerivConfig();
    configOk = true;
  } catch (err) {
    configError = err instanceof Error ? err.message : "Configuration error";
  }

  let authReachable = false;
  let authStatus: number | null = null;
  try {
    const probe = await fetch(derivConfig.oauthAuthorizeUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    authStatus = probe.status;
    authReachable = probe.status < 500;
  } catch {
    authReachable = false;
  }

  let apiReachable = false;
  try {
    const health = await fetch(`${derivConfig.restBaseUrl}/v1/health`, {
      signal: AbortSignal.timeout(8_000),
    });
    apiReachable = health.ok;
  } catch {
    apiReachable = false;
  }

  return NextResponse.json({
    demoMode: isDemoMode,
    liveTradingEnabled: !isDemoMode,
    configOk,
    configError,
    oauth: {
      authorizeUrl: derivConfig.oauthAuthorizeUrl,
      redirectUri,
      clientIdConfigured: Boolean(derivConfig.oauthClientId),
      appId: derivConfig.appId ? `${derivConfig.appId.slice(0, 4)}…` : null,
      authReachable,
      authStatus,
    },
    api: {
      baseUrl: derivConfig.restBaseUrl,
      reachable: apiReachable,
    },
    patFallbackAvailable: true,
    setupChecklist: [
      "Set NEXT_PUBLIC_DEMO_MODE=false in .env.local",
      "Register redirect URI in Deriv Application Manager: " + redirectUri,
      "If browser OAuth is blocked (Cloudflare), use Personal Access Token sign-in",
    ],
  });
}
