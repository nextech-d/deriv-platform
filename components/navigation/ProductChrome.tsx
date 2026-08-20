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
}

function NavbarAccountSwitch({
  accounts,
  activeAccountId,
  onAccountChange,
  demoMode = false,
}: {
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  demoMode?: boolean;
}) {
  const active = accounts.find((item) => item.accountId === activeAccountId) ?? accounts[0];
  const demoAccount = accounts.find((item) => item.isDemo);
  const realAccount = accounts.find((item) => !item.isDemo);
  const guest = accounts.length === 0;
  const demoOn = guest || Boolean(active?.isDemo);
  const realLoginHref =
    !realAccount && (guest || demoMode) ? AUTH_LOGIN_PATH : undefined;

  return (
    <div
      className="tc-account-switch"
      role="group"
      aria-label="Account type"
      data-testid="tc-account-switch"
    >
      <button
        type="button"
        className={cn("tc-account-switch-btn", demoOn && "is-on")}
        aria-pressed={demoOn}
        disabled={!guest && !demoAccount}
        title={demoAccount || guest ? "Demo account" : "No demo account on this login"}
        onClick={() => {
          if (demoAccount && demoAccount.accountId !== active?.accountId) {
            onAccountChange(demoAccount.accountId);
          }
        }}
      >
        Demo
      </button>
      {realAccount ? (
        <button
          type="button"
          className={cn("tc-account-switch-btn", !demoOn && "is-on")}
          aria-pressed={!demoOn}
          title="Real account"
          onClick={() => {
            if (realAccount.accountId !== active?.accountId) {
              onAccountChange(realAccount.accountId);
            }
          }}
        >
          Real
        </button>
      ) : realLoginHref ? (
        <Link href={realLoginHref} className="tc-account-switch-btn" title="Log in to use a real account">
          Real
        </Link>
      ) : (
        <button
          type="button"
          className="tc-account-switch-btn"
          disabled
          title="No real account on this login"
        >
          Real
        </button>
      )}
    </div>
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
          {onAccountChange ? (
            <NavbarAccountSwitch
              accounts={accounts ?? []}
              activeAccountId={activeAccountId}
              onAccountChange={onAccountChange}
              demoMode={demoMode}
            />
          ) : null}
          {account ? (
            <div className="tc-auth">
              <span className="tc-loginid">{account.loginid}</span>
              <button type="button" className="tc-btn tc-btn-ghost" onClick={onLogout}>
                Log out
              </button>
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
