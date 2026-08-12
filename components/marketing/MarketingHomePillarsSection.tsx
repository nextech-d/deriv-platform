"use client";

import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { HOME_PILLARS, HOME_SECTIONS } from "@/lib/marketing/home-content";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";

interface MarketingHomePillarsSectionProps {
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

export function MarketingHomePillarsSection({ onNavigate }: MarketingHomePillarsSectionProps) {
  return (
    <section className="marketing-home-section marketing-home-pillars">
      <div className="marketing-pillars">
        <div className="marketing-pillars-shell">
          <header className="marketing-instrument-head marketing-pillars-head">
            <div className="marketing-instrument-head-copy">
              <p className="marketing-eyebrow">{HOME_SECTIONS.pillars.eyebrow}</p>
              <h2 className="marketing-instrument-title">{HOME_SECTIONS.pillars.title}</h2>
              <p className="marketing-instrument-lead">{HOME_SECTIONS.pillars.lead}</p>
            </div>
          </header>

          <div className="marketing-pillars-lanes marketing-instrument-rows">
            {HOME_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              const laneStyle = { "--lane-i": index } as CSSProperties;

              const rowBody = (
                <>
                  <div className="marketing-instrument-row-mark">
                    <span className="marketing-instrument-row-icon marketing-pillars-icon" aria-hidden>
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </div>

                  <div className="marketing-instrument-row-copy marketing-pillars-lane-copy">
                    <div className="marketing-instrument-row-title marketing-pillars-title-row">
                      <h3 className="marketing-pillars-title">{pillar.title}</h3>
                      <span className="marketing-pillars-tagline">{pillar.tagline}</span>
                    </div>
                    <p className="marketing-pillars-body">{pillar.body}</p>
                  </div>

                  <footer className="marketing-instrument-row-foot marketing-pillars-foot">
                    <span className="marketing-pillars-link">
                      Open
                      <span className="marketing-pillars-link-label"> {pillar.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </footer>
                </>
              );

              if (onNavigate) {
                return (
                  <button
                    key={pillar.id}
                    type="button"
                    className="marketing-instrument-row marketing-pillars-lane marketing-pillars-lane-action interactive"
                    data-lane={pillar.id}
                    style={laneStyle}
                    onClick={() => onNavigate(pillar.id, pillar.id)}
                  >
                    {rowBody}
                  </button>
                );
              }

              return (
                <article
                  key={pillar.id}
                  className="marketing-instrument-row marketing-pillars-lane"
                  data-lane={pillar.id}
                  style={laneStyle}
                >
                  {rowBody}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
