"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketingHomeSection } from "@/components/marketing/MarketingHomeSection";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingPlatformPanel } from "@/components/marketing/MarketingPlatformPanel";
import {
  platformNavIdFromSectionId,
  platformSectionHref,
  PLATFORM_NAV_ORDER,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { readSectionIdFromHash } from "@/lib/navigation/scroll-to-section";
import { cn } from "@/lib/utils/cn";

interface LandingPageProps {
  demoMode?: boolean;
  isLoggedIn?: boolean;
}

type PanelDirection = "forward" | "back" | "none";

function resolveActiveIdFromHash(): PlatformNavId {
  const hash = readSectionIdFromHash();
  if (!hash) return "home";
  return platformNavIdFromSectionId(hash) ?? "home";
}

function directionBetween(from: PlatformNavId, to: PlatformNavId): PanelDirection {
  const prevIdx = PLATFORM_NAV_ORDER.indexOf(from);
  const nextIdx = PLATFORM_NAV_ORDER.indexOf(to);
  if (prevIdx < 0 || nextIdx < 0 || prevIdx === nextIdx) return "none";
  return nextIdx > prevIdx ? "forward" : "back";
}

export function LandingPage({ demoMode = false, isLoggedIn = false }: LandingPageProps) {
  const [activeId, setActiveId] = useState<PlatformNavId>("home");
  const [panelDirection, setPanelDirection] = useState<PanelDirection>("none");
  const prevActiveRef = useRef<PlatformNavId>("home");
  const launchHref = isLoggedIn || demoMode ? "/dashboard" : "/login";

  const activatePanel = useCallback((id: PlatformNavId) => {
    setPanelDirection(directionBetween(prevActiveRef.current, id));
    prevActiveRef.current = id;
    setActiveId(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const syncFromHash = () => activatePanel(resolveActiveIdFromHash());

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [activatePanel]);

  const handleNavigate = useCallback(
    (sectionId: string, id: PlatformNavId) => {
      activatePanel(id);
      window.history.replaceState(null, "", platformSectionHref(sectionId));
    },
    [activatePanel],
  );

  return (
    <div className="marketing-page marketing-page--desktop-first relative min-h-dvh overflow-x-hidden bg-canvas">
      <div className="page-accent-wash pointer-events-none absolute inset-0" />
      <div
        className="marketing-hero-glow pointer-events-none absolute left-1/2 top-[-4rem] h-[40rem] w-[52rem] -translate-x-1/3 rounded-full blur-3xl"
        aria-hidden
      />

      <MarketingNavbar
        demoMode={demoMode}
        isLoggedIn={isLoggedIn}
        activeId={activeId}
        onNavigate={handleNavigate}
      />
      <div className="marketing-page-spacer" aria-hidden />

      <main className="marketing-page-main relative mx-auto w-full max-w-[84rem] px-6 pb-24 xl:px-12">
        <div
          key={activeId}
          className={cn(
            "marketing-workspace-panel",
            panelDirection === "forward" && "marketing-workspace-panel--forward",
            panelDirection === "back" && "marketing-workspace-panel--back",
          )}
        >
          <div className="marketing-stagger">
            {activeId === "home" ? (
              <MarketingHomeSection
                demoMode={demoMode}
                isLoggedIn={isLoggedIn}
                onNavigate={handleNavigate}
              />
            ) : (
              <MarketingPlatformPanel navId={activeId} terminalHref={launchHref} />
            )}
          </div>
        </div>

        {activeId === "home" ? (
          <section className="marketing-cta">
            <div className="marketing-cta-copy">
              <p className="marketing-eyebrow">Ready to trade</p>
              <h2 className="marketing-cta-title">Open the desk</h2>
              <p className="marketing-cta-body">
                {demoMode
                  ? "Demo mode is on — launch the terminal, land on Home, and trade Volatility or Boom/Crash with live ticks."
                  : "Sign in with Deriv, fund via Cashier or local agents, and trade from Home — manual, Auto, or Copy."}
              </p>
            </div>
            <Link href={launchHref}>
              <Button size="lg" className="interactive">
                {isLoggedIn ? "Open terminal" : demoMode ? "Launch demo" : "Sign in"}
              </Button>
            </Link>
          </section>
        ) : null}

        <footer className="marketing-footer">
          <p className="marketing-footer-label">Risk disclosure</p>
          <p className="marketing-footer-body">
            Synthetic indices and leveraged products carry high risk. This platform
            is a third-party app using the Deriv API — not affiliated with Deriv.Com
            Limited. Not regulated by Kenya&apos;s CMA. Never trade money you cannot
            afford to lose.
          </p>
        </footer>
      </main>
    </div>
  );
}
