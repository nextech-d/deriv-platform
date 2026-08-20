"use client";

import Link from "next/link";
import {
  AUTH_LOGIN_PATH,
  DERIV_EXTERNAL_LINK,
  getDerivSignupUrl,
} from "@/lib/auth/auth-links";
import {
  PLATFORM_NAV_ITEMS,
  platformSectionHref,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { BrandMark, BrandWord } from "@/components/navigation/BrandLockup";

interface MarketingFooterProps {
  onNavigate: (sectionId: string, id: PlatformNavId) => void;
}

const FOOTER_SITEMAP: { heading: string; ids: PlatformNavId[] }[] = [
  { heading: "Desk", ids: ["dashboard", "bot-builder", "free-bots"] },
  {
    heading: "Trade",
    ids: ["d-trader", "analysis-tool", "signal-center", "money-management", "copy-trading"],
  },
  {
    heading: "Studio",
    ids: ["edging", "edging-2", "fast-trader", "chart", "ultimate-bot", "bulk-trader"],
  },
];

const FOOTER_FEATURES = [
  { label: "Display", detail: "KES · UGX · TZS · RWF · USD" },
  { label: "Markets", detail: "Volatility · Boom/Crash" },
  { label: "Execution", detail: "Manual · Auto · Copy" },
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

export function MarketingFooter({ onNavigate }: MarketingFooterProps) {
  const signupHref = getDerivSignupUrl();

  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-inner">
        <div className="marketing-footer-top">
          <div className="marketing-footer-brand">
            <Link
              href={platformSectionHref("overview")}
              className="tc-brand"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("overview", "dashboard");
              }}
            >
              <BrandMark />
              <BrandWord />
            </Link>
            <p className="marketing-footer-brand-tagline">
              Synthetics desk for East Africa — one feed for Manual, Auto, and Copy.
            </p>
            <dl className="marketing-footer-spec">
              {FOOTER_FEATURES.map((feature) => (
                <div key={feature.label} className="marketing-footer-spec-row">
                  <dt>{feature.label}</dt>
                  <dd>{feature.detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <nav className="marketing-footer-sitemap" aria-label="Site map">
            {FOOTER_SITEMAP.map((group) => (
              <div key={group.heading} className="marketing-footer-sitemap-group">
                <p className="marketing-footer-sitemap-heading">{group.heading}</p>
                <ul className="marketing-footer-sitemap-list">
                  {group.ids.map((id) => {
                    const item = PLATFORM_NAV_ITEMS.find((entry) => entry.id === id);
                    if (!item) return null;
                    return (
                      <li key={item.id}>
                        <FooterLink
                          label={item.label}
                          sectionId={item.sectionId}
                          navId={item.id}
                          onNavigate={onNavigate}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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
                    {...DERIV_EXTERNAL_LINK}
                  >
                    Sign up
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="marketing-footer-disclosure">
          <p className="marketing-footer-label">Risk disclosure</p>
          <p className="marketing-footer-body">
            Synthetic indices and leveraged products carry high risk. This platform is a third-party
            app using the Deriv API — not affiliated with Deriv.Com Limited. Not regulated by
            Kenya&apos;s CMA. Never trade money you cannot afford to lose.
          </p>
        </div>
      </div>

      <div className="marketing-footer-bottom">
        <p className="marketing-footer-copyright">
          © {new Date().getFullYear()} TradeCity
        </p>
        <p className="marketing-footer-mark">East Africa</p>
        <p className="marketing-footer-powered">
          <a href="https://api.deriv.com" target="_blank" rel="noopener noreferrer">
            Deriv API
          </a>
        </p>
      </div>
    </footer>
  );
}
