"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MarketingDashboardPanel } from "@/components/marketing/MarketingDashboardPanel";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  isMarketingLiveDeskId,
  MarketingLiveDeskPanel,
} from "@/components/marketing/MarketingLiveDeskPanel";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingPlatformPanel } from "@/components/marketing/MarketingPlatformPanel";
import {
  platformSectionHref,
  PLATFORM_NAV_ORDER,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import {
  marketingScrollKey,
  usePageScrollRestoration,
} from "@/lib/navigation/scroll-restoration";
import {
  clearBootHold,
  resolveLandingView,
} from "@/lib/navigation/workspace-boot";
import { useScrollAnywhere } from "@/hooks/useScrollAnywhere";
import { cn } from "@/lib/utils/cn";

interface LandingPageProps {
  demoMode?: boolean;
  isLoggedIn?: boolean;
}

type PanelDirection = "forward" | "back" | "none";

function directionBetween(from: PlatformNavId, to: PlatformNavId): PanelDirection {
  const prevIdx = PLATFORM_NAV_ORDER.indexOf(from);
  const nextIdx = PLATFORM_NAV_ORDER.indexOf(to);
  if (prevIdx < 0 || nextIdx < 0 || prevIdx === nextIdx) return "none";
  return nextIdx > prevIdx ? "forward" : "back";
}

export function LandingPage(_props: LandingPageProps = {}) {
  const [activeId, setActiveId] = useState<PlatformNavId>("dashboard");
  const [viewReady, setViewReady] = useState(false);
  const [panelDirection, setPanelDirection] = useState<PanelDirection>("none");
  const [scrollReady, setScrollReady] = useState(false);
  const prevActiveRef = useRef<PlatformNavId>("dashboard");
  const userNavigatedRef = useRef(false);

  useScrollAnywhere();

  const { scrollToTop } = usePageScrollRestoration(marketingScrollKey(activeId), {
    enabled: scrollReady,
  });

  const activatePanel = useCallback(
    (id: PlatformNavId, options?: { scrollToTop?: boolean }) => {
      setPanelDirection(directionBetween(prevActiveRef.current, id));
      prevActiveRef.current = id;
      setActiveId(id);

      if (options?.scrollToTop) {
        scrollToTop(window);
      }
    },
    [scrollToTop],
  );

  useLayoutEffect(() => {
    const fromHash = resolveLandingView();
    prevActiveRef.current = fromHash;
    setActiveId(fromHash);
    setViewReady(true);
    setScrollReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!viewReady) return;
    clearBootHold();
  }, [viewReady]);

  useEffect(() => {
    const syncFromHash = () => {
      activatePanel(resolveLandingView(), {
        scrollToTop: userNavigatedRef.current,
      });
      userNavigatedRef.current = false;
    };

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [activatePanel]);

  const handleNavigate = useCallback(
    (sectionId: string, id: PlatformNavId) => {
      userNavigatedRef.current = true;
      activatePanel(id, { scrollToTop: true });
      window.history.replaceState(null, "", platformSectionHref(sectionId));
    },
    [activatePanel],
  );

  return (
    <div className="marketing-page marketing-page--desktop-first relative min-h-dvh overflow-x-hidden bg-canvas" data-scroll-root>
      <div className="page-accent-wash pointer-events-none absolute inset-0" />
      <div
        className="marketing-hero-glow pointer-events-none absolute left-1/2 top-[-4rem] h-[40rem] w-[52rem] -translate-x-1/3 rounded-full blur-3xl"
        aria-hidden
      />

      <MarketingNavbar
        activeId={activeId}
        onNavigate={handleNavigate}
      />
      <div className="marketing-page-spacer" aria-hidden />

      <main className="marketing-page-main relative mx-auto w-full max-w-[84rem] px-6 pb-16 xl:px-12">
        {viewReady ? (
        <div
          key={activeId}
          className={cn(
            "marketing-workspace-panel",
            panelDirection === "forward" && "marketing-workspace-panel--forward",
            panelDirection === "back" && "marketing-workspace-panel--back",
          )}
        >
          <div className="marketing-stagger">
            {activeId === "dashboard" ? (
              <MarketingDashboardPanel onNavigate={handleNavigate} />
            ) : isMarketingLiveDeskId(activeId) ? (
              <MarketingLiveDeskPanel
                navId={activeId}
                onNavigate={handleNavigate}
              />
            ) : (
              <MarketingPlatformPanel navId={activeId} />
            )}
          </div>
        </div>
        ) : (
          <div className="marketing-workspace-panel" aria-hidden />
        )}
      </main>

      <MarketingFooter onNavigate={handleNavigate} />
    </div>
  );
}
