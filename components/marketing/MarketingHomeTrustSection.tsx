"use client";

import { HOME_SECTIONS, HOME_TRUST } from "@/lib/marketing/home-content";

export function MarketingHomeTrustSection() {
  return (
    <aside className="marketing-home-trust">
      <header className="marketing-trust-intro">
        <div className="marketing-trust-intro-copy">
          <p className="marketing-eyebrow">{HOME_SECTIONS.trust.eyebrow}</p>
          <h2 className="marketing-trust-intro-title">{HOME_SECTIONS.trust.title}</h2>
        </div>
      </header>

      <ul className="marketing-trust-list marketing-instrument-rows">
        {HOME_TRUST.map((item, index) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="marketing-instrument-row marketing-trust-item"
              data-trust={index + 1}
            >
              <div className="marketing-instrument-row-mark">
                <span className="marketing-trust-icon" aria-hidden>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              </div>

              <div className="marketing-instrument-row-copy marketing-trust-copy">
                <h3 className="marketing-trust-label">{item.label}</h3>
                <p className="marketing-trust-detail">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
