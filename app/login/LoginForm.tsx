"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/trading/ThemeToggle";
import { BrandMark, BrandWord } from "@/components/navigation/BrandLockup";
import {
  AUTH_DASHBOARD_PATH,
  AUTH_OAUTH_PATH,
  DERIV_EXTERNAL_LINK,
  getDerivSignupUrl,
} from "@/lib/auth/auth-links";
import { cn } from "@/lib/utils/cn";

interface AuthStatus {
  demoMode: boolean;
  liveTradingEnabled: boolean;
  configOk: boolean;
  configError: string | null;
  oauth: {
    redirectUri: string;
    authReachable: boolean;
    clientIdConfigured: boolean;
  };
  api: { reachable: boolean };
}

function mapLoginError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("cloudflare") || lower.includes("blocked")) {
    return "Deriv OAuth blocked your network (Cloudflare). Use Personal Access Token sign-in below, or try a VPN.";
  }
  if (lower.includes("invalid_scope")) {
    return "Deriv rejected the login scopes. In Application Manager enable Trade, Account manage, and Payment, then try again.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Network error reaching Deriv OAuth. Check connection or use PAT sign-in below.";
  }
  return error;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const verified = searchParams.get("verified") === "1";

  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [patToken, setPatToken] = useState("");
  const [patLoading, setPatLoading] = useState(false);
  const [patError, setPatError] = useState<string | null>(null);
  const [showPat, setShowPat] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/status")
      .then((r) => r.json())
      .then((json: AuthStatus) => setStatus(json))
      .catch(() => setStatus(null));
  }, []);

  async function handlePatSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPatLoading(true);
    setPatError(null);
    try {
      const response = await fetch("/api/auth/pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: patToken }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPatError(json.error ?? "Token rejected");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setPatError("Could not validate token");
    } finally {
      setPatLoading(false);
    }
  }

  const error = errorParam ? mapLoginError(decodeURIComponent(errorParam)) : null;

  return (
    <div className="login-shell relative flex min-h-dvh overflow-hidden bg-canvas">
      <div className="page-accent-wash pointer-events-none absolute inset-0" aria-hidden />

      <div className="login-aside hidden w-[min(50%,28rem)] shrink-0 p-4 pl-5 pt-5 lg:flex lg:flex-col">
        <div className="shell-float login-aside-panel flex flex-1 flex-col justify-between p-10">
          <div>
            <div className="flex items-center gap-2.5">
              <Link href="/" className="tc-brand">
                <BrandMark />
                <BrandWord />
              </Link>
            </div>
            <h1 className="login-aside-title">
              Log in with your Deriv account
            </h1>
            <p className="login-aside-copy">
              TradeCity does not create trader accounts. Sign in with Deriv OAuth
              to trade. If Cloudflare blocks OAuth, paste a Deriv personal access
              token instead.
            </p>
            <ul className="login-aside-list">
              <li>
                <Shield className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
                Server-side session — tokens never in browser storage
              </li>
              <li>
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
                PAT fallback when OAuth is unreachable
              </li>
            </ul>
          </div>
          <p className="text-[10px] text-muted">Kenya · Uganda · Tanzania · Rwanda</p>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 md:px-6">
        <div className="mb-4 flex w-full max-w-md items-center justify-between lg:hidden">
          <Link href="/" className="tc-brand">
            <BrandMark />
            <BrandWord />
          </Link>
          <ThemeToggle variant="icon" className="command-icon-btn" />
        </div>

        <div className="desk-panel login-panel w-full max-w-md">
          <div className="desk-head">
            <div className="desk-head-main">
              <p className="desk-head-title">Log in</p>
              <p className="desk-head-hint">Deriv OAuth — PAT if OAuth is blocked</p>
            </div>
          </div>

          <div className="desk-body login-panel-body workspace-pane">
            <p className="login-panel-copy">
              Connect your Deriv account to trade from this desk. New here? Create
              the account at Deriv, then come back to log in.
            </p>

            {status ? (
              <div className="bot-stat-strip login-status-strip desk-tile">
                {[
                  {
                    label: "Mode",
                    value: status.liveTradingEnabled ? "Live OAuth" : "Demo bypass",
                  },
                  {
                    label: "API",
                    value: status.api.reachable ? "Reachable" : "Unreachable",
                    warn: !status.api.reachable,
                  },
                  {
                    label: "OAuth",
                    value: status.oauth.authReachable ? "Reachable" : "Blocked",
                    warn: !status.oauth.authReachable,
                  },
                  {
                    label: "Config",
                    value: status.configOk ? "OK" : "Error",
                    warn: !status.configOk,
                  },
                ].map((cell, index, arr) => (
                  <div
                    key={cell.label}
                    className={cn(
                      "bot-stat-cell",
                      index < arr.length - 1 && "bot-stat-cell-divider",
                    )}
                  >
                    <p className="session-metric-label">{cell.label}</p>
                    <p
                      className={cn(
                        "bot-stat-value",
                        cell.warn && "text-warning",
                      )}
                    >
                      {cell.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {!status?.configOk && status?.configError ? (
              <p className="workspace-inline-alert workspace-inline-alert-danger text-[10px]">
                {status.configError}
              </p>
            ) : null}

            {status ? (
              <p className="login-redirect font-mono text-[9px] text-muted">
                Redirect: {status.oauth.redirectUri}
              </p>
            ) : null}

            {verified ? (
              <p className="workspace-inline-alert workspace-inline-alert-demo text-[11px]">
                Email verified. Log in with Deriv to open the desk.
              </p>
            ) : null}

            {error ? (
              <p className="workspace-inline-alert workspace-inline-alert-danger text-[11px]">
                {error}
              </p>
            ) : null}

            <a
              href={AUTH_OAUTH_PATH}
              className={cn(
                "login-primary-action inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent text-sm font-medium text-white interactive",
                status != null && !status.configOk && "pointer-events-none opacity-40",
              )}
              {...DERIV_EXTERNAL_LINK}
            >
              Log in with Deriv
            </a>
            <p className="login-signup">
              Don&apos;t have a Deriv account?{" "}
              <a href={getDerivSignupUrl()} {...DERIV_EXTERNAL_LINK}>
                Sign up
              </a>
            </p>

            {status?.demoMode ? (
              <p className="workspace-inline-alert workspace-inline-alert-warn text-center text-[10px]">
                Demo mode is on — set NEXT_PUBLIC_DEMO_MODE=false in .env.local
                and restart the dev server.
              </p>
            ) : null}

            <div className="login-divider">
              <span>or</span>
            </div>

            {!showPat ? (
              <Button
                variant="secondary"
                className="interactive w-full"
                onClick={() => setShowPat(true)}
              >
                Use Personal Access Token
              </Button>
            ) : (
              <form
                onSubmit={(e) => void handlePatSubmit(e)}
                className="login-pat-form space-y-2.5"
              >
                <p className="text-[10px] text-muted">
                  Generate a token at{" "}
                  <a
                    href="https://api.deriv.com/account/api-token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Deriv API token settings
                  </a>{" "}
                  with Read, Trade, and Payments scopes.
                </p>
                <div className="trade-field-group">
                  <label className="trade-field-label" htmlFor="pat-token">
                    Access token
                  </label>
                  <Input
                    id="pat-token"
                    type="password"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    placeholder="Paste access token"
                    mono
                    autoComplete="off"
                    className="h-10"
                  />
                </div>
                {patError ? (
                  <p className="workspace-inline-alert workspace-inline-alert-danger text-[10px]">
                    {patError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="interactive w-full"
                  disabled={patLoading || !patToken.trim()}
                >
                  {patLoading ? "Validating…" : "Sign in with token"}
                </Button>
              </form>
            )}

            <p className="login-demo-link text-center text-[10px] text-muted">
              <Link href={AUTH_DASHBOARD_PATH} className="text-accent hover:underline">
                Continue without signing in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
