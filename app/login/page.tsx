import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionOrDefault } from "@/lib/session";
import { LoginForm } from "@/app/login/LoginForm";
import { AUTH_DASHBOARD_PATH } from "@/lib/auth/auth-links";

export default async function LoginPage() {
  const session = await getSessionOrDefault();
  if (session.isLoggedIn) {
    redirect(AUTH_DASHBOARD_PATH);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
