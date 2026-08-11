import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/config/demo";
import { derivConfig } from "@/lib/config/deriv";
import { getSessionOrDefault } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  if (isDemoMode) {
    return (
      <DashboardClient
        demoMode
        accounts={DEMO_ACCOUNTS}
        activeAccountId={DEMO_ACCOUNTS[0].accountId}
      />
    );
  }

  const session = await getSessionOrDefault();

  if (!session.isLoggedIn) {
    if (derivConfig.serverApiToken.trim()) {
      redirect("/api/auth/env-bootstrap?next=/dashboard");
    }
    redirect("/login");
  }

  return (
    <DashboardClient
      accounts={session.accounts ?? []}
      activeAccountId={session.activeAccountId}
    />
  );
}
