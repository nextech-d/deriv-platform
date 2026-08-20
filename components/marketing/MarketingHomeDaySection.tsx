"use client";

import { useCallback, type CSSProperties } from "react";
import { HOME_DAY_ON_DESK, HOME_SECTIONS } from "@/lib/marketing/home-content";
import { platformSectionIdFromNavId, type PlatformNavId } from "@/lib/navigation/platform-nav";

interface MarketingHomeDaySectionProps {
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

function sectionIdForNav(id: PlatformNavId): string {
  return platformSectionIdFromNavId(id);
}

export function MarketingHomeDaySection({ onNavigate }: MarketingHomeDaySectionProps) {
  const navigateTo = useCallback(
    (navId: PlatformNavId) => {
      onNavigate?.(sectionIdForNav(navId), navId);
    },
    [onNavigate],
  );

  return (
    <section className="marketing-home-section marketing-home-day">
      <div className="marketing-day">
        <div className="marketing-day-shell">
          <header className="marketing-day-intro">
            <p className="marketing-eyebrow">{HOME_SECTIONS.day.eyebrow}</p>
            <h2 className="marketing-day-intro-title">{HOME_SECTIONS.day.title}</h2>
            <p className="marketing-day-intro-lead">{HOME_SECTIONS.day.lead}</p>
          </header>

          <ol className="marketing-day-timeline">
            {HOME_DAY_ON_DESK.map((moment, index) => {
              const isDashboard = moment.navId === "dashboard";

              const rowBody = (
                <>
                  <time className="marketing-day-time font-mono" dateTime={moment.time}>
                    {moment.time}
                  </time>
                  <div className="marketing-day-moment-copy">
                    <div className="marketing-day-title-row">
                      <h3 className="marketing-day-title">{moment.title}</h3>
                      <span className="marketing-day-tagline font-mono">{moment.workspace}</span>
                    </div>
                    <p className="marketing-day-body">{moment.body}</p>
                  </div>
                </>
              );

              if (isDashboard || !onNavigate) {
                return (
                  <li
                    key={`${moment.time}-${moment.workspace}`}
                    className="marketing-day-moment"
                    data-nav={moment.navId}
                    style={{ "--moment-i": index } as CSSProperties}
                  >
                    {rowBody}
                  </li>
                );
              }

              return (
                <li
                  key={`${moment.time}-${moment.workspace}`}
                  className="marketing-day-moment-item"
                  style={{ "--moment-i": index } as CSSProperties}
                >
                  <button
                    type="button"
                    className="marketing-day-moment marketing-day-moment-action interactive"
                    data-nav={moment.navId}
                    onClick={() => navigateTo(moment.navId)}
                  >
                    {rowBody}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
