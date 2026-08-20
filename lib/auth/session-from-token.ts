import { fetchAccounts } from "@/lib/deriv/api";
import { derivConfig } from "@/lib/config/deriv";
import { getSession } from "@/lib/session";
import type { DerivAccount } from "@/lib/session/types";

export interface TokenSessionInput {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export async function establishSessionFromToken(
  input: TokenSessionInput,
): Promise<{ accounts: DerivAccount[]; activeAccountId?: string }> {
  const accounts = await fetchAccounts(input.accessToken);

  if (accounts.length === 0) {
    throw new Error("No Deriv accounts found for this token");
  }

  const activeAccount =
    accounts.find((a) => !a.isDemo) ?? accounts.find((a) => a.isDemo) ?? accounts[0];

  const session = await getSession();
  session.accessToken = input.accessToken;
  session.refreshToken = input.refreshToken;
  session.expiresAt = input.expiresIn
    ? Date.now() + input.expiresIn * 1000
    : undefined;
  session.accounts = accounts;
  session.activeAccountId = activeAccount?.accountId;
  session.isLoggedIn = true;
  await session.save();

  return {
    accounts,
    activeAccountId: activeAccount?.accountId,
  };
}

/** 5-minute buffer before actual expiry. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Updates the session in-place and saves it.
 * Returns `true` on success, `false` on failure (session cleared).
 */
export async function refreshAccessToken(): Promise<boolean> {
  const session = await getSession();

  if (!session.refreshToken) {
    session.isLoggedIn = false;
    session.accessToken = undefined;
    await session.save();
    return false;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
      client_id: derivConfig.oauthClientId,
    });

    const response = await fetch(derivConfig.oauthTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "deriv-platform/0.1 (OAuth refresh)",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      session.isLoggedIn = false;
      session.accessToken = undefined;
      session.refreshToken = undefined;
      await session.save();
      return false;
    }

    const json = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!json.access_token) {
      session.isLoggedIn = false;
      session.accessToken = undefined;
      await session.save();
      return false;
    }

    session.accessToken = json.access_token;
    if (json.refresh_token) session.refreshToken = json.refresh_token;
    session.expiresAt = json.expires_in
      ? Date.now() + json.expires_in * 1000
      : undefined;
    await session.save();
    return true;
  } catch {
    session.isLoggedIn = false;
    session.accessToken = undefined;
    await session.save();
    return false;
  }
}

/** Returns true if the session token is near expiry and should be refreshed. */
export function isTokenExpiringSoon(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  return Date.now() >= expiresAt - REFRESH_BUFFER_MS;
}
