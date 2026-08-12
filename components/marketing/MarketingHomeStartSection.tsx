"use client";

import type { CSSProperties } from "react";
import { HOME_SECTIONS, HOME_STEPS } from "@/lib/marketing/home-content";

export function MarketingHomeStartSection() {
  return (
    <section className="marketing-home-section marketing-home-start">
      <header className="marketing-start-intro">
        <div className="marketing-start-intro-copy">
          <p className="marketing-eyebrow">{HOME_SECTIONS.start.eyebrow}</p>
          <h2 className="marketing-start-intro-title">{HOME_SECTIONS.start.title}</h2>
          <p className="marketing-start-intro-lead">{HOME_SECTIONS.start.lead}</p>
        </div>
      </header>

      <ol className="marketing-start-steps marketing-instrument-rows">
        {HOME_STEPS.map((step, index) => (
          <li
            key={step.step}
            className="marketing-instrument-row marketing-start-step"
            data-step={step.step}
            style={{ "--step-i": index } as CSSProperties}
          >
            <div className="marketing-instrument-row-mark">
              <span className="marketing-start-index font-mono" aria-hidden>
                {step.step}
              </span>
            </div>

            <div className="marketing-instrument-row-copy marketing-start-copy">
              <div className="marketing-instrument-row-title marketing-start-title-row">
                <h3 className="marketing-start-title">{step.title}</h3>
                <span className="marketing-start-tagline font-mono">{step.tag}</span>
              </div>
              <p className="marketing-start-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
