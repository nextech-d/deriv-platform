"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformNavRail } from "@/components/navigation/PlatformNavRail";
import { ThemeToggle } from "@/components/trading/ThemeToggle";
import {
  platformSectionHref,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { setNavScrollOffset } from "@/lib/navigation/scroll-to-section";
import { cn } from "@/lib/utils/cn";

interface MarketingNavbarProps {
  demoMode?: boolean;
  isLoggedIn?: boolean;
  activeId: PlatformNavId;
  onNavigate: (sectionId: string, id: PlatformNavId) => void;
}

export function MarketingNavbar({
  demoMode = false,
  isLoggedIn = false,
  activeId,
  onNavigate,
}: MarketingNavbarProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const syncNavOffset = useCallback(() => {
    const header = headerRef.current;
    if (!header) return;
    setNavScrollOffset(header.getBoundingClientRect().bottom + 12);
  }, []);

  useEffect(() => {
    syncNavOffset();
    const header = headerRef.current;
    if (!header) return;

    const ro = new ResizeObserver(() => syncNavOffset());
    ro.observe(header);
    window.addEventListener("resize", syncNavOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncNavOffset);
    };
  }, [syncNavOffset, mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closeMobile() {
    setMobileOpen(false);
  }

  const handleSectionNavigate = useCallback(
    (sectionId: string, id: PlatformNavId) => {
      closeMobile();
      onNavigate(sectionId, id);
    },
    [onNavigate],
  );

  function handleBrandClick(e: React.MouseEvent) {
    e.preventDefault();
    handleSectionNavigate("overview", "home");
  }

  const launchHref = isLoggedIn || demoMode ? "/dashboard" : "/login";
  const launchLabel = isLoggedIn
    ? "Open terminal"
    : demoMode
      ? "Launch demo"
      : "Get started";

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "marketing-header marketing-header-fixed",
          scrolled && "marketing-header-scrolled",
          mobileOpen && "marketing-header-menu-open",
        )}
      >
        <div className="marketing-header-backdrop" aria-hidden />
        <div className="marketing-nav-shell mx-auto max-w-7xl px-4 md:px-6">
          <div className="marketing-nav-bar">
            <Link
              href={platformSectionHref("overview")}
              className="marketing-nav-brand interactive"
              onClick={handleBrandClick}
            >
              <TrendingUp
                className="marketing-nav-brand-icon h-[1.125rem] w-[1.125rem]"
                strokeWidth={2}
              />
              <span className="marketing-nav-brand-name">Deriv EA</span>
              <span className="marketing-nav-brand-sep" aria-hidden>
                /
              </span>
              <span className="marketing-nav-brand-tag">Terminal</span>
            </Link>

            <div className="marketing-nav-center">
              <PlatformNavRail
                activeId={activeId}
                variant="marketing"
                onSectionNavigate={handleSectionNavigate}
              />
            </div>

            <div className="marketing-nav-actions">
              <ThemeToggle variant="icon" className="marketing-nav-icon-btn" />
              {!isLoggedIn ? (
                <Link href="/login" className="marketing-nav-signin hidden xl:block">
                  Sign in
                </Link>
              ) : null}
              <Link href={launchHref} className="marketing-nav-cta-link hidden sm:block">
                <span className="marketing-nav-cta">
                  {launchLabel}
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </span>
              </Link>
              <button
                type="button"
                className="marketing-nav-icon-btn marketing-nav-menu-btn lg:hidden"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? (
                  <X className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                ) : (
                  <Menu className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="marketing-nav-overlay lg:hidden" role="presentation">
          <button
            type="button"
            className="marketing-nav-overlay-backdrop"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div className="marketing-nav-sheet">
            <div className="marketing-nav-sheet-head">
              <p className="marketing-nav-sheet-title">Navigate</p>
              <p className="marketing-nav-sheet-sub">Platform workspaces</p>
            </div>
            <PlatformNavRail
              activeId={activeId}
              variant="marketing"
              className="platform-nav-rail-sheet"
              onSectionNavigate={handleSectionNavigate}
            />
            <div className="marketing-nav-sheet-cta">
              {!isLoggedIn ? (
                <Link href="/login" onClick={closeMobile}>
                  <Button variant="secondary" size="sm" className="interactive w-full">
                    Sign in
                  </Button>
                </Link>
              ) : null}
              <Link href={launchHref} onClick={closeMobile}>
                <Button size="sm" className="interactive w-full gap-2">
                  {launchLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
