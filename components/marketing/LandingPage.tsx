"use client";

import Link from "next/link";
import {
  Globe2,
  Shield,
  Smartphone,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/trading/ThemeToggle";

const FEATURES = [
  {
    icon: Wifi,
    title: "Survives bad networks",
    body: "WebSocket engine runs in a background Worker with auto-reconnect — built for 3G/4G handoffs.",
  },
  {
    icon: Shield,
    title: "Secure by default",
    body: "OAuth 2.0 PKCE with server-side tokens. No API keys in browser storage.",
  },
  {
    icon: Globe2,
    title: "East Africa first",
    body: "KES / UGX / TZS / RWF display, M-Pesa Cashier flow, and payment agent directory.",
  },
  {
    icon: Zap,
    title: "State that persists",
    body: "Open contracts cached in IndexedDB — reload without losing your portfolio view.",
  },
] as const;

const MARKETS = ["R_10", "R_100", "BOOM1000", "CRASH1000"];

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-grid">
      <div className="page-accent-wash pointer-events-none absolute inset-0" />

      <header className="marketing-header sticky top-0 z-20">
        <div className="marketing-header-outer mx-auto max-w-5xl px-3 pt-2.5 md:px-4 md:pt-3">
          <div className="shell-float marketing-header-panel flex items-center justify-between px-5 py-3 md:px-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-accent" strokeWidth={2.25} />
              <div>
                <p className="workspace-eyebrow text-accent">Deriv · East Africa</p>
                <p className="text-[10px] text-muted">Kenya · Uganda · Tanzania · Rwanda</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="icon" className="command-icon-btn" />
              <Link href="/login">
                <Button variant="secondary" size="sm" className="interactive">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-3 pb-16 pt-2 md:px-4">
        <section className="landing-hero max-w-2xl">
          <div className="landing-hero-badge shell-float-pill">
            <span className="command-feed-dot h-1.5 w-1.5 rounded-full bg-positive animate-pulse-dot" />
            Resilient WebSocket trading shell
          </div>
          <h1 className="landing-hero-title">
            Trade synthetics on networks that drop
          </h1>
          <p className="landing-hero-copy">
            A Deriv trading terminal — resilient market data, local currency PnL,
            and mobile-money funding for East African traders.
          </p>
          <div className="landing-hero-actions">
            <Link href="/login">
              <Button size="lg" className="interactive">
                Sign in with Deriv
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="interactive">
                Open terminal
              </Button>
            </Link>
          </div>
          <div className="landing-market-rail">
            {MARKETS.map((m) => (
              <span key={m} className="landing-market-chip desk-tile font-mono">
                {m}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="desk-panel landing-feature-panel">
                <div className="desk-head">
                  <div className="desk-head-main">
                    <p className="desk-head-title">{feature.title}</p>
                  </div>
                </div>
                <div className="desk-body workspace-pane landing-feature-body">
                  <Icon className="mb-2 h-4 w-4 text-muted" strokeWidth={1.75} />
                  <p className="text-[11px] leading-relaxed text-muted">{feature.body}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="desk-panel landing-disclosure mt-8">
          <div className="desk-head">
            <div className="desk-head-main">
              <p className="desk-head-title text-accent">Risk disclosure</p>
            </div>
          </div>
          <div className="desk-body workspace-pane flex items-start gap-2.5">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
            <p className="max-w-3xl text-[11px] leading-relaxed text-muted">
              Synthetic indices and leveraged products carry high risk. This platform
              is a third-party app using the Deriv API — not affiliated with Deriv.Com
              Limited. Not regulated by Kenya&apos;s CMA. Never trade money you cannot
              afford to lose.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
