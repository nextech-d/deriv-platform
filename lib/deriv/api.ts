import { derivConfig } from "@/lib/config/deriv";
import type { DerivAccount } from "@/lib/session/types";
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface OtpResponse {
  data?: {
    url?: string;
    attributes?: {
      websocket_url?: string;
      url?: string;
    };
    websocket_url?: string;
  };
  websocket_url?: string;
  errors?: Array<{ message?: string }>;
}

interface AccountsResponse {
  data?: Array<{
    id?: string;
    account_id?: string;
    loginid?: string;
    currency?: string;
    account_type?: string;
    is_virtual?: boolean;
    attributes?: {
      loginid?: string;
      currency?: string;
      account_type?: string;
      is_virtual?: boolean;
    };
  }>;
}

function derivHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Deriv-App-ID": derivConfig.appId,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "deriv-platform/0.1 (East Africa; OAuth PKCE)",
  };
}

const oauthFetchHeaders: HeadersInit = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "deriv-platform/0.1 (East Africa; OAuth PKCE)",
};

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: derivConfig.oauthClientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(derivConfig.oauthTokenUrl, {
    method: "POST",
    headers: oauthFetchHeaders,
    body: body.toString(),
  });

  return response.json() as Promise<TokenResponse>;
}

export async function fetchAccounts(accessToken: string): Promise<DerivAccount[]> {
  const response = await fetchWithTimeout(
    `${derivConfig.restBaseUrl}/trading/v1/options/accounts`,
    { headers: derivHeaders(accessToken), cache: "no-store", timeoutMs: 12_000 },
  );

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as AccountsResponse;
  const rows = json.data ?? [];

  return rows
    .map((row) => {
      const attrs = row.attributes ?? {};
      const accountId = row.account_id ?? row.id ?? "";
      const loginid = attrs.loginid ?? row.loginid ?? accountId;
      if (!accountId && !loginid) return null;

      const accountType = attrs.account_type ?? row.account_type;
      const isVirtual = attrs.is_virtual ?? row.is_virtual;

      const isDemo =
        isVirtual === true ||
        accountType === "demo" ||
        loginid.startsWith("VRT") ||
        loginid.startsWith("DOT");

      return {
        accountId: accountId || loginid,
        loginid,
        currency: attrs.currency ?? row.currency ?? "USD",
        isDemo,
      } satisfies DerivAccount;
    })
    .filter((a): a is DerivAccount => a !== null);
}

export async function fetchWebSocketUrl(
  accessToken: string,
  accountId: string,
): Promise<string> {
  const response = await fetchWithTimeout(
    `${derivConfig.restBaseUrl}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
    {
      method: "POST",
      headers: derivHeaders(accessToken),
      cache: "no-store",
      timeoutMs: 12_000,
    },
  );

  const json = (await response.json()) as OtpResponse;

  if (!response.ok) {
    const message =
      json.errors?.[0]?.message ?? `OTP request failed (${response.status})`;
    throw new Error(message);
  }

  const url =
    json.websocket_url ??
    json.data?.url ??
    json.data?.websocket_url ??
    json.data?.attributes?.websocket_url ??
    json.data?.attributes?.url;

  if (!url) {
    throw new Error("OTP response did not include a websocket URL");
  }

  return url;
}
