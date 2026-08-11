import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config/demo";
import { buildCashierLink } from "@/lib/payments/cashier-url";
import { getSessionOrDefault } from "@/lib/session";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const returnUrl =
    request.nextUrl.searchParams.get("returnUrl")?.trim() ||
    `${origin}/dashboard`;

  if (isDemoMode) {
    const link = buildCashierLink({ returnUrl, demoMode: true });
    return NextResponse.json(link);
  }

  const session = await getSessionOrDefault();
  const activeAccount = session.accounts?.find(
    (account) => account.accountId === session.activeAccountId,
  );
  const loginid = activeAccount?.loginid ?? session.accounts?.[0]?.loginid;

  const link = buildCashierLink({
    returnUrl,
    accessToken: session.accessToken,
    loginid,
    demoMode: false,
  });

  return NextResponse.json(link);
}
