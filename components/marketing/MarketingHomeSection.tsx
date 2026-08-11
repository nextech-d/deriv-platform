"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLiveFeedPanel } from "@/components/marketing/MarketingLiveFeedPanel";
import {
  HOME_HERO,
  HOME_MARKET_GROUPS,
  HOME_METRICS,
  HOME_PILLARS,
  HOME_SECTIONS,
  HOME_STEPS,
  HOME_TRUST,
  HOME_WORKSPACES,
} from "@/lib/marketing/home-content";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";

interface MarketingHomeSectionProps {
  demoMode?: boolean;
  isLoggedIn?: boolean;
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

const WORKSPACE_GROUPS = ["Overview", "Trading", "Account"] as const;

function launchHref(demoMode: boolean, isLoggedIn: boolean) {
  if (isLoggedIn || demoMode) return "/dashboard";
  return "/login";
}

function workspaceSectionId(id: PlatformNavId): string {
  if (id === "home") return "overview";
  return id;
}

export function MarketingHomeSection({
  demoMode = false,
  isLoggedIn = false,
  onNavigate,
}: MarketingHomeSectionProps) {
  const href = launchHref(demoMode, isLoggedIn);
  const primaryLabel = isLoggedIn
    ? "Open terminal"
    : demoMode
      ? "Launch demo terminal"
      : "Sign in with Deriv";

  const workspacesByGroup = WORKSPACE_GROUPS.map((group) => ({
    group,
    items: HOME_WORKSPACES.filter((item) => item.group === group),
  }));

  return (
    <div className="marketing-home">
      <section id="overview" className="marketing-home-hero">
        <div className="marketing-home-hero-shell">
          <div className="marketing-home-hero-main">
            <p className="marketing-eyebrow marketing-home-hero-eyebrow">
              <span className="command-feed-dot h-1.5 w-1.5 rounded-full bg-positive animate-pulse-dot" />
              {HOME_HERO.eyebrow}
            </p>
            <h1 className="marketing-home-hero-title">
              {HOME_HERO.title}{" "}
              <span className="marketing-home-hero-accent">{HOME_HERO.titleAccent}</span>
            </h1>
            <p className="marketing-home-hero-lead">{HOME_HERO.lead}</p>
            <div className="marketing-home-hero-actions">
              <Link href={href}>
                <Button size="lg" className="interactive gap-2">
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              </Link>
              {!isLoggedIn && !demoMode ? (
                <Link href="/dashboard">
                  <Button size="lg" variant="secondary" className="interactive">
                    Try demo desk
                  </Button>
                </Link>
              ) : null}
            </div>
            <ul className="marketing-home-hero-proofs" aria-label="Platform highlights">
              {HOME_HERO.proofs.map((proof) => (
                <li key={proof} className="marketing-home-hero-proof">
                  {proof}
                </li>
              ))}
            </ul>
          </div>

          <MarketingLiveFeedPanel />
        </div>

        <div className="marketing-home-hero-markets">
          <p className="marketing-home-hero-markets-kicker">Markets on the desk</p>
          <div className="marketing-home-hero-markets-grid">
            {HOME_MARKET_GROUPS.map((marketGroup) => (
              <div key={marketGroup.label} className="marketing-home-market-group">
                <span className="marketing-home-markets-label">{marketGroup.label}</span>
                <div className="marketing-home-markets-rail">
                  {marketGroup.symbols.map((symbol) => (
                    <span key={symbol} className="marketing-home-market-chip font-mono">
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-home-section marketing-home-pillars">
        <header className="marketing-home-section-head">
          <p className="marketing-eyebrow">{HOME_SECTIONS.pillars.eyebrow}</p>
          <h2 className="marketing-home-section-title">{HOME_SECTIONS.pillars.title}</h2>
          <p className="marketing-home-section-lead">{HOME_SECTIONS.pillars.lead}</p>
        </header>
        <div className="marketing-home-pillars-grid">
          {HOME_PILLARS.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.id} className="marketing-home-pillar-card">
                <div className="marketing-home-pillar-top">
                  <span className="marketing-home-pillar-index font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="marketing-home-pillar-icon">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                </div>
                <p className="marketing-home-pillar-tagline">{pillar.tagline}</p>
                <h3 className="marketing-home-pillar-title">{pillar.title}</h3>
                <p className="marketing-home-pillar-body">{pillar.body}</p>
                <button
                  type="button"
                  className="marketing-home-pillar-link interactive"
                  onClick={() => onNavigate?.(pillar.id, pillar.id)}
                >
                  See {pillar.title}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-home-section marketing-home-workspaces">
        <header className="marketing-home-section-head">
          <p className="marketing-eyebrow">{HOME_SECTIONS.platform.eyebrow}</p>
          <h2 className="marketing-home-section-title">{HOME_SECTIONS.platform.title}</h2>
          <p className="marketing-home-section-lead">{HOME_SECTIONS.platform.lead}</p>
        </header>

        <div className="marketing-home-workspace-board">
          {workspacesByGroup.map(({ group, items }) => (
            <div key={group} className="marketing-home-workspace-column">
              <p className="marketing-home-workspace-group-label">{group}</p>
              <ul className="marketing-home-workspace-list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isHome = item.id === "home";
                  const sectionId = workspaceSectionId(item.id);

                  if (isHome) {
                    return (
                      <li
                        key={item.id}
                        className="marketing-home-workspace-row marketing-home-workspace-row-active"
                      >
                        <span className="marketing-home-workspace-row-icon">
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="marketing-home-workspace-row-label">
                            {item.title}
                          </span>
                          <span className="marketing-home-workspace-row-desc">
                            {item.body}
                          </span>
                        </span>
                        <span className="marketing-home-workspace-badge">Hub</span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="marketing-home-workspace-row marketing-home-workspace-row-link interactive w-full text-left"
                        onClick={() => onNavigate?.(sectionId, item.id)}
                      >
                        <span className="marketing-home-workspace-row-icon">
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="marketing-home-workspace-row-label">
                            {item.title}
                          </span>
                          <span className="marketing-home-workspace-row-desc">
                            {item.body}
                          </span>
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 text-muted"
                          strokeWidth={2}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="marketing-home-duo">
        <section className="marketing-home-section marketing-home-steps">
          <header className="marketing-home-section-head">
            <p className="marketing-eyebrow">{HOME_SECTIONS.start.eyebrow}</p>
            <h2 className="marketing-home-section-title">{HOME_SECTIONS.start.title}</h2>
          </header>
          <ol className="marketing-home-steps-list">
            {HOME_STEPS.map((step) => (
              <li key={step.step} className="marketing-home-step">
                <span className="marketing-home-step-index font-mono">{step.step}</span>
                <div className="marketing-home-step-copy">
                  <h3 className="marketing-home-step-title">{step.title}</h3>
                  <p className="marketing-home-step-body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="marketing-home-trust">
          <p className="marketing-home-trust-kicker">Why traders use this desk</p>
          <ul className="marketing-home-trust-list">
            {HOME_TRUST.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="marketing-home-trust-item">
                  <span className="marketing-home-trust-icon">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
          <p className="marketing-home-trust-note">
            Third-party app using the Deriv API — not affiliated with Deriv.Com
            Limited. Not regulated by Kenya&apos;s CMA.
          </p>
        </aside>
      </div>

      <section className="marketing-home-stats" aria-label="Platform highlights">
        {HOME_METRICS.map((metric) => (
          <article key={metric.label} className="marketing-home-stat">
            <p className="marketing-home-stat-value font-mono">{metric.value}</p>
            <p className="marketing-home-stat-label">{metric.label}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
