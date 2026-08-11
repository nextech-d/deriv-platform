import { LandingPage } from "@/components/marketing/LandingPage";
import { isDemoMode } from "@/lib/config/demo";
import { getSessionOrDefault } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (isDemoMode) {
    redirect("/dashboard");
  }

  const session = await getSessionOrDefault();
  if (session.isLoggedIn) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
