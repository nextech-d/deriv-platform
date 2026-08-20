import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/config/demo";
import { getSessionOrDefault } from "@/lib/session";

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
    return <DashboardClient accounts={[]} />;
  }

  return (
    <DashboardClient
      accounts={session.accounts ?? []}
      activeAccountId={session.activeAccountId}
    />
  );
}
