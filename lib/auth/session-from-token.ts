import { fetchAccounts } from "@/lib/deriv/api";
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
