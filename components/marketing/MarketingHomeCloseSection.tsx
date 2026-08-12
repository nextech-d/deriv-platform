"use client";

import { MarketingHomeStartSection } from "@/components/marketing/MarketingHomeStartSection";
import { MarketingHomeStatsSection } from "@/components/marketing/MarketingHomeStatsSection";
import { MarketingHomeTrustSection } from "@/components/marketing/MarketingHomeTrustSection";

export function MarketingHomeCloseSection() {
  return (
    <div className="marketing-home-close">
      <div className="marketing-duo-shell">
        <div className="marketing-home-duo">
          <MarketingHomeStartSection />
          <MarketingHomeTrustSection />
        </div>

        <footer className="marketing-duo-disclaimer" aria-label="Disclaimer">
          <div className="marketing-duo-disclaimer-rule" aria-hidden />
          <div className="marketing-duo-disclaimer-panel">
            <p className="marketing-duo-disclaimer-head font-mono">
              <span className="marketing-duo-disclaimer-label">Disclaimer</span>
            </p>
            <p className="marketing-duo-disclaimer-text">
              Third-party app using the Deriv API — not affiliated with Deriv.Com Limited. Not
              regulated by Kenya&apos;s CMA.
            </p>
          </div>
        </footer>
      </div>

      <div className="marketing-close-connector" aria-hidden />

      <div className="marketing-stats-shell">
        <div className="marketing-stats-grid-bg" aria-hidden />
        <div className="marketing-stats-shine" aria-hidden />
        <div className="marketing-stats-glow" aria-hidden />
        <div className="marketing-stats-scanline" aria-hidden />
        <div className="marketing-stats-corners" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>

        <MarketingHomeStatsSection />
      </div>
    </div>
  );
}
