"use client";

import { MarketingHomeCloseSection } from "@/components/marketing/MarketingHomeCloseSection";
import { MarketingHomeDaySection } from "@/components/marketing/MarketingHomeDaySection";
import { MarketingHomePillarsSection } from "@/components/marketing/MarketingHomePillarsSection";
import { MarketingHomeWorkspacesSection } from "@/components/marketing/MarketingHomeWorkspacesSection";
import { MarketingLiveFeedPanel } from "@/components/marketing/MarketingLiveFeedPanel";
import { MarketingMarketsPanel } from "@/components/marketing/MarketingMarketsPanel";
import { HOME_HERO } from "@/lib/marketing/home-content";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";

interface MarketingHomeSectionProps {
  demoMode?: boolean;
  isLoggedIn?: boolean;
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

export function MarketingHomeSection({ onNavigate }: MarketingHomeSectionProps) {
  return (
    <div className="marketing-home">
      <section id="overview" className="marketing-home-command">
        <div className="marketing-command-deck">
          <div className="marketing-command-deck-grid-bg" aria-hidden />
          <div className="marketing-command-deck-shine" aria-hidden />
          <div className="marketing-command-deck-corners" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="marketing-home-hero">
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
              </div>

              <MarketingLiveFeedPanel />
            </div>
          </div>

          <MarketingMarketsPanel onNavigate={onNavigate} nested />
        </div>
      </section>

      <div className="marketing-home-bento">
        <div className="marketing-home-bento-col marketing-home-bento-col--pillars">
          <MarketingHomePillarsSection onNavigate={onNavigate} />
        </div>
        <div className="marketing-home-bento-col marketing-home-bento-col--day">
          <MarketingHomeDaySection onNavigate={onNavigate} />
        </div>
      </div>

      <MarketingHomeWorkspacesSection onNavigate={onNavigate} />

      <MarketingHomeCloseSection />
    </div>
  );
}
