import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config/demo";
import { derivConfig } from "@/lib/config/deriv";
import { getSessionOrDefault } from "@/lib/session";
import { LoginForm } from "@/app/login/LoginForm";

export default async function LoginPage() {
  if (isDemoMode) {
    redirect("/dashboard");
  }

  const session = await getSessionOrDefault();
  if (session.isLoggedIn) {
    redirect("/dashboard");
  }

  if (derivConfig.serverApiToken.trim()) {
    redirect("/api/auth/env-bootstrap?next=/dashboard");
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
