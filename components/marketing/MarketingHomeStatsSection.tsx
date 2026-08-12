"use client";

import { HOME_METRICS, HOME_SECTIONS } from "@/lib/marketing/home-content";

export function MarketingHomeStatsSection() {
  return (
    <section className="marketing-home-section marketing-home-stats-section" aria-label="Platform highlights">
      <header className="marketing-stats-intro">
        <div className="marketing-stats-intro-copy">
          <p className="marketing-eyebrow">{HOME_SECTIONS.metrics.eyebrow}</p>
          <h2 className="marketing-stats-intro-title">{HOME_SECTIONS.metrics.title}</h2>
          <p className="marketing-stats-intro-lead">{HOME_SECTIONS.metrics.lead}</p>
        </div>
        <p className="marketing-stats-intro-meta font-mono">
          <span className="marketing-stats-meta-beacon" aria-hidden />
          <span>{HOME_METRICS.length} signals</span>
          <span aria-hidden>·</span>
          <span>Live desk</span>
        </p>
      </header>

      <div className="marketing-stats-telemetry">
        <ul className="marketing-stats-strip">
          {HOME_METRICS.map((metric, index) => (
            <li key={metric.label} className="marketing-stat-item" data-stat={index + 1}>
              <span className="marketing-stat-accent" aria-hidden />
              <span className="marketing-stat-grid" aria-hidden />
              <p className="marketing-stat-value font-mono">{metric.value}</p>
              <p className="marketing-stat-label font-mono">{metric.label}</p>
            </li>
          ))}
        </ul>
        <p className="marketing-stats-foot font-mono">
          <span className="marketing-stats-foot-beacon" aria-hidden />
          Desk telemetry · session snapshot
        </p>
      </div>
    </section>
  );
}
