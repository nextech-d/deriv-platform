"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MarketingAuthButtons } from "@/components/marketing/MarketingAuthButtons";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHomeSection } from "@/components/marketing/MarketingHomeSection";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingPlatformPanel } from "@/components/marketing/MarketingPlatformPanel";
import { HOME_CTA } from "@/lib/marketing/home-content";
import {
  platformNavIdFromSectionId,
  platformSectionHref,
  PLATFORM_NAV_ORDER,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import {
  marketingScrollKey,
  usePageScrollRestoration,
} from "@/lib/navigation/scroll-restoration";
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
  const [scrollReady, setScrollReady] = useState(false);
  const prevActiveRef = useRef<PlatformNavId>("home");
  const userNavigatedRef = useRef(false);

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
    const fromHash = resolveActiveIdFromHash();
    prevActiveRef.current = fromHash;
    setActiveId(fromHash);
    setScrollReady(true);
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      activatePanel(resolveActiveIdFromHash(), {
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
    <div className="marketing-page marketing-page--desktop-first relative min-h-dvh overflow-x-hidden bg-canvas">
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
              <MarketingPlatformPanel navId={activeId} />
            )}
          </div>
        </div>

        {activeId === "home" ? (
          <section className="marketing-cta">
            <div className="marketing-cta-copy">
              <h2 className="marketing-cta-title">{HOME_CTA.title}</h2>
              <p className="marketing-cta-body">
                {demoMode ? HOME_CTA.bodyDemo : HOME_CTA.bodyLive}
              </p>
            </div>
            <MarketingAuthButtons size="lg" className="marketing-cta-actions" />
          </section>
        ) : null}

        <MarketingFooter onNavigate={handleNavigate} />
      </main>
    </div>
  );
}
