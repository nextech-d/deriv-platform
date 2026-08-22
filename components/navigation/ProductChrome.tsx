"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AUTH_LOGIN_PATH,
  DERIV_EXTERNAL_LINK,
  getDerivSignupUrl,
} from "@/lib/auth/auth-links";
import { PLATFORM_NAV_ITEMS, type PlatformNavId } from "@/lib/navigation/platform-nav";
import { ProductNavIcon } from "@/components/navigation/product-nav-icons";
import { BrandMark, BrandWord } from "@/components/navigation/BrandLockup";
import { ThemeToggle } from "@/components/trading/ThemeToggle";
import type { DerivAccount } from "@/lib/session/types";
import { cn } from "@/lib/utils/cn";
import { AccountSwitcher } from "@/components/navigation/AccountSwitcher";

const SPLIT_AFTER = new Set<PlatformNavId>(["free-bots", "copy-trading", "edging-2"]);
const TICK_WIDTH = 18;

interface ProductNavbarProps {
  activeId: string;
  onSelect: (id: PlatformNavId) => void;
  brandHref?: string;
  account?: DerivAccount;
  accounts?: DerivAccount[];
  activeAccountId?: string;
  onAccountChange?: (id: string) => void;
  demoMode?: boolean;
  onLogout?: () => void;
  balance?: { amount: number; currency: string } | null;
}

function NavbarAccountSwitch({
  accounts,
  activeAccountId,
  onAccountChange,
  balance,
  onLogout,
}: {
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  demoMode?: boolean;
  balance?: { amount: number; currency: string } | null;
  onLogout?: () => void;
}) {
  return (
    <AccountSwitcher
      accounts={accounts}
      activeAccountId={activeAccountId}
      onAccountChange={onAccountChange}
      balance={balance}
      onLogout={onLogout}
    />
  );
}

export function ProductNavbar({
  activeId,
  onSelect,
  brandHref = "/",
  account,
  accounts,
  activeAccountId,
  onAccountChange,
  demoMode = false,
  onLogout,
  balance,
}: ProductNavbarProps) {
  const [tick, setTick] = useState({ x: 0, ready: false, motion: false });
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const node = track;

    function place() {
      const active = node.querySelector<HTMLElement>(".tc-nav-item.is-active");
      if (!active) {
        setTick((prev) => ({ ...prev, ready: false }));
        return;
      }
      const x = active.offsetLeft + (active.offsetWidth - TICK_WIDTH) / 2;
      setTick((prev) => ({
        x,
        ready: true,
        motion: prev.ready,
      }));
    }

    place();
    const ro = new ResizeObserver(place);
    ro.observe(node);
    return () => ro.disconnect();
  }, [activeId]);

  return (
    <header className="tc-navbar">
      <div className="tc-navbar-top">
        <Link href={brandHref} className="tc-brand">
          <BrandMark />
          <BrandWord />
        </Link>
        <div className="tc-navbar-top-right">
          <ThemeToggle variant="navbar" />
          {onAccountChange && (accounts?.length ?? 0) > 0 ? (
            <NavbarAccountSwitch
              accounts={accounts ?? []}
              activeAccountId={activeAccountId}
              onAccountChange={onAccountChange}
              demoMode={demoMode}
              balance={balance}
              onLogout={onLogout}
            />
          ) : null}
          {account ? (
            <div className="tc-auth">
              <span className="tc-loginid">{account.loginid}</span>
            </div>
          ) : (
            <div className="tc-auth">
              <Link href={AUTH_LOGIN_PATH} className="tc-btn tc-btn-ghost">
                Log in
              </Link>
              <a
                href={getDerivSignupUrl()}
                className="tc-btn tc-btn-solid"
                {...DERIV_EXTERNAL_LINK}
              >
                Sign up
              </a>
            </div>
          )}
        </div>
      </div>

      <nav className="tc-navbar-menus" aria-label="Platform navigation">
        <div className="tc-navbar-menus-track" ref={trackRef}>
          <span
            className={cn("tc-nav-indicator", tick.ready && "is-ready", tick.motion && "is-motion")}
            style={{ transform: `translateX(${tick.x}px)` }}
            aria-hidden
          />
          {PLATFORM_NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "tc-nav-item",
                  isActive && "is-active",
                  SPLIT_AFTER.has(item.id) && "is-split",
                )}
                data-nav={item.id}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                onClick={() => onSelect(item.id)}
              >
                <span className="tc-nav-icon">
                  <ProductNavIcon id={item.id} />
                  {item.id === "free-bots" ? <span className="tc-nav-dot" /> : null}
                </span>
                <span className="tc-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
