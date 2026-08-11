import { LandingPage } from "@/components/marketing/LandingPage";
import { isDemoMode } from "@/lib/config/demo";
import { getSessionOrDefault } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSessionOrDefault();
  const demoMode = isDemoMode;

  if (!demoMode && session.isLoggedIn) {
    redirect("/dashboard");
  }

  return (
    <LandingPage demoMode={demoMode} isLoggedIn={session.isLoggedIn} />
  );
}
