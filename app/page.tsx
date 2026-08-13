import { LandingPage } from "@/components/marketing/LandingPage";
import { isDemoMode } from "@/lib/config/demo";
import { getSessionOrDefault } from "@/lib/session";

export default async function HomePage() {
  const session = await getSessionOrDefault();

  return (
    <LandingPage demoMode={isDemoMode} isLoggedIn={session.isLoggedIn} />
  );
}
