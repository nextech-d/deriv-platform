"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { AUTH_LOGIN_PATH, getDerivSignupUrl } from "@/lib/auth/auth-links";
import {
  PLATFORM_NAV_ITEMS,
  platformSectionHref,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";

interface MarketingFooterProps {
  onNavigate: (sectionId: string, id: PlatformNavId) => void;
}

const TRADING_IDS: PlatformNavId[] = ["trade", "auto", "copy", "portfolio"];
const ACCOUNT_IDS: PlatformNavId[] = ["home", "wallet", "settings"];

const FOOTER_FEATURES = [
  { label: "Local display", detail: "KES · UGX · TZS · RWF · USD" },
  { label: "Markets", detail: "Volatility · Boom/Crash" },
  { label: "Execution", detail: "Manual · Auto bots · Copy" },
  { label: "Funding", detail: "Cashier · East Africa agents" },
] as const;

function FooterLink({
  label,
  sectionId,
  navId,
  onNavigate,
}: {
  label: string;
  sectionId: string;
  navId: PlatformNavId;
  onNavigate: MarketingFooterProps["onNavigate"];
}) {
  return (
    <Link
      href={platformSectionHref(sectionId)}
      className="marketing-footer-sitemap-link"
      onClick={(event) => {
        event.preventDefault();
        onNavigate(sectionId, navId);
      }}
    >
      {label}
    </Link>
  );
}

function SitemapGroup({
  heading,
  ids,
  onNavigate,
}: {
  heading: string;
  ids: PlatformNavId[];
  onNavigate: MarketingFooterProps["onNavigate"];
}) {
  const items = ids
    .map((id) => PLATFORM_NAV_ITEMS.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="marketing-footer-sitemap-group">
      <p className="marketing-footer-sitemap-heading">{heading}</p>
      <ul className="marketing-footer-sitemap-list">
        {items.map((item) => (
          <li key={item.id}>
            <FooterLink
              label={item.label}
              sectionId={item.sectionId}
              navId={item.id}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter({ onNavigate }: MarketingFooterProps) {
  const signupHref = getDerivSignupUrl();

  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-top">
        <div className="marketing-footer-brand">
          <Link
            href={platformSectionHref("overview")}
            className="marketing-footer-brand-lockup interactive"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("overview", "home");
            }}
          >
            <TrendingUp className="marketing-footer-brand-icon" strokeWidth={2} aria-hidden />
            <span className="marketing-footer-brand-name">Deriv EA</span>
            <span className="marketing-footer-brand-sep" aria-hidden>
              /
            </span>
            <span className="marketing-footer-brand-tag">Terminal</span>
          </Link>
          <p className="marketing-footer-brand-tagline">
            Synthetics desk for East Africa — one feed for Trade, Auto, and Copy.
          </p>
          <ul className="marketing-footer-features">
            {FOOTER_FEATURES.map((feature) => (
              <li key={feature.label} className="marketing-footer-feature">
                <span className="marketing-footer-feature-label font-mono">{feature.label}</span>
                <span className="marketing-footer-feature-detail">{feature.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <nav className="marketing-footer-sitemap" aria-label="Site map">
          <SitemapGroup heading="Trading" ids={TRADING_IDS} onNavigate={onNavigate} />
          <SitemapGroup heading="Account" ids={ACCOUNT_IDS} onNavigate={onNavigate} />
          <div className="marketing-footer-sitemap-group">
            <p className="marketing-footer-sitemap-heading">Access</p>
            <ul className="marketing-footer-sitemap-list">
              <li>
                <Link href={AUTH_LOGIN_PATH} className="marketing-footer-sitemap-link">
                  Log in
                </Link>
              </li>
              <li>
                <a
                  href={signupHref}
                  className="marketing-footer-sitemap-link"
                  rel="noopener noreferrer"
                >
                  Sign up
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="marketing-footer-sitemap-link">
                  Open terminal
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="marketing-footer-disclosure">
        <p className="marketing-footer-label font-mono">Risk disclosure</p>
        <p className="marketing-footer-body">
          Synthetic indices and leveraged products carry high risk. This platform is a third-party
          app using the Deriv API — not affiliated with Deriv.Com Limited. Not regulated by
          Kenya&apos;s CMA. Never trade money you cannot afford to lose.
        </p>
      </div>
    </footer>
  );
}
