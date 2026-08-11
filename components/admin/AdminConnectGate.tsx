"use client";

import Link from "next/link";
import { Loader2, ArrowLeft, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/trading/ThemeToggle";
import { AdminStudioNav } from "@/components/admin/AdminStudioNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminStudioKind } from "@/components/admin/AdminStudioChrome";

const GATE_COPY: Record<
  AdminStudioKind,
  { kicker: string; title: string; description: string; inputId: string }
> = {
  partners: {
    kicker: "Partner studio",
    title: "Payment agent catalog",
    description:
      "Publish and manage mobile-money partners shown in the Wallet directory.",
    inputId: "admin-token-partners",
  },
  copy: {
    kicker: "Copy studio",
    title: "Signal provider catalog",
    description:
      "Curate copy-trading desks surfaced in the Copy workspace.",
    inputId: "admin-token-copy",
  },
};

interface AdminConnectGateProps {
  studio: AdminStudioKind;
  token: string;
  loading: boolean;
  error: string | null;
  onTokenChange: (value: string) => void;
  onConnect: () => void;
}

export function AdminConnectGate({
  studio,
  token,
  loading,
  error,
  onTokenChange,
  onConnect,
}: AdminConnectGateProps) {
  const copy = GATE_COPY[studio];

  return (
    <div className="admin-shell admin-connect-shell flex min-h-dvh flex-col bg-background">
      <header className="admin-topbar shrink-0">
        <div className="admin-topbar-inner mx-auto w-full max-w-2xl px-4 md:px-6">
          <Link
            href="/dashboard"
            className="admin-connect-back interactive"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Terminal
          </Link>
          <ThemeToggle variant="icon" className="admin-topbar-icon-btn" />
        </div>
      </header>

      <main className="admin-connect-main mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16 pt-10 md:max-w-lg md:px-6">
        <div className="admin-connect-mark mb-8 flex justify-center">
          <span className="admin-connect-mark-icon" aria-hidden>
            <Shield className="h-5 w-5" strokeWidth={1.75} />
          </span>
        </div>

        <div className="text-center">
          <AdminStudioNav active={studio} className="mx-auto" />
          <p className="admin-connect-kicker mt-6">{copy.kicker}</p>
          <h1 className="admin-connect-title">{copy.title}</h1>
          <p className="admin-connect-copy">{copy.description}</p>
        </div>

        <div className="admin-connect-card mt-8">
          <label className="admin-field-label" htmlFor={copy.inputId}>
            Admin token
          </label>
          <p className="admin-field-hint">
            Use the same value as{" "}
            <code className="admin-inline-code">ADMIN_SECRET</code> on the server.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              id={copy.inputId}
              type="password"
              placeholder="Paste token"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              className="h-10 flex-1"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && token && !loading) onConnect();
              }}
            />
            <Button
              className="interactive h-10 px-5"
              disabled={!token || loading}
              onClick={onConnect}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                "Enter"
              )}
            </Button>
          </div>
          {error ? (
            <p className="admin-connect-error" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
