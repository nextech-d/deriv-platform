import type { CSSProperties } from "react";
import { Copy, Shield, Zap, Users } from "lucide-react";
import { MarketingAuthButtons } from "@/components/marketing/MarketingAuthButtons";
import { COPY_PANEL, getCopyPanelProviders } from "@/lib/marketing/copy-panel";

const HIGHLIGHTS = [
  { icon: Users, label: "Curated desks", detail: "Vetted providers across East Africa" },
  { icon: Zap, label: "60s signals", detail: "Real-time calls, not Telegram forwards" },
  { icon: Shield, label: "Isolated risk", detail: "Copy losses stay off your manual book" },
  { icon: Copy, label: "Auto-copy", detail: "Mirror trades hands-free or tap to confirm" },
] as const;

export function MarketingCopyPanel() {
  const providers = getCopyPanelProviders();
  const signal = COPY_PANEL.signal;
  const ttlPct = Math.round((signal.ttlSeconds / 60) * 100);

  return (
    <section
      id="copy-trading"
      className="marketing-workspace-section marketing-panel marketing-copy-panel"
      data-panel="copy-trading"
      tabIndex={-1}
    >
      <div className="marketing-stagger">
        <header className="marketing-copy-hero">
          <p className="marketing-eyebrow">{COPY_PANEL.eyebrow}</p>
          <h1 className="marketing-copy-hero-title">{COPY_PANEL.title}</h1>
          <p className="marketing-copy-hero-summary">{COPY_PANEL.summary}</p>
          <p className="marketing-copy-hero-lead">{COPY_PANEL.lead}</p>
        </header>

        <div className="marketing-copy-highlights">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="marketing-copy-highlight">
                <span className="marketing-copy-highlight-icon">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="marketing-copy-highlight-label">{item.label}</p>
                  <p className="marketing-copy-highlight-detail">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="marketing-copy-layout">
          <div className="marketing-copy-main">
            <section className="marketing-copy-providers" aria-labelledby="copy-providers-heading">
              <div className="marketing-copy-section-head">
                <h2 id="copy-providers-heading" className="marketing-copy-section-title">
                  Who you can follow
                </h2>
                <p className="marketing-copy-section-aside">
                  Five desks across East Africa — same synthetics, different styles.
                </p>
              </div>

              <ol className="marketing-copy-provider-list">
                {providers.map((provider, index) => (
                  <li key={provider.id} className="marketing-copy-provider" data-country={provider.country}>
                    <span className="marketing-copy-provider-index font-mono" aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="marketing-copy-provider-body">
                      <div className="marketing-copy-provider-title-row">
                        <h3 className="marketing-copy-provider-name">{provider.name}</h3>
                        <span className="marketing-copy-provider-place font-mono">
                          {provider.place}
                          <span aria-hidden> · </span>
                          {provider.country}
                        </span>
                      </div>
                      <p className="marketing-copy-provider-blurb">{provider.blurb}</p>
                      <p className="marketing-copy-provider-meta font-mono">
                        <span>{provider.style}</span>
                        <span aria-hidden>·</span>
                        <span>{provider.symbols}</span>
                        <span aria-hidden>·</span>
                        <span>{provider.winRate}</span>
                        <span aria-hidden>·</span>
                        <span>{provider.risk}</span>
                        {provider.verified ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="marketing-copy-provider-verified">Verified</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="marketing-copy-steps" aria-labelledby="copy-steps-heading">
              <div className="marketing-copy-section-head">
                <h2 id="copy-steps-heading" className="marketing-copy-section-title">
                  How a session goes
                </h2>
              </div>

              <ol className="marketing-copy-step-list">
                {COPY_PANEL.steps.map((step, index) => (
                  <li key={step.title} className="marketing-copy-step">
                    <span className="marketing-copy-step-index font-mono" aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="marketing-copy-step-title">{step.title}</h3>
                      <p className="marketing-copy-step-detail">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="marketing-copy-rail" aria-label="Example signal">
            <div className="marketing-copy-signal">
              <p className="marketing-copy-signal-eyebrow font-mono">
                <span className="marketing-copy-signal-beacon" aria-hidden />
                Example signal · {signal.ttlSeconds}s left
              </p>

              <p className="marketing-copy-signal-from">
                From <strong>{signal.provider}</strong>
                <span className="marketing-copy-signal-from-place font-mono"> {signal.country}</span>
              </p>

              <p className="marketing-copy-signal-call">
                <span className="marketing-copy-signal-symbol font-mono">{signal.symbol}</span>
                <span className="marketing-copy-signal-side" data-side={signal.side.toLowerCase()}>
                  {signal.side}
                </span>
              </p>

              <div
                className="marketing-copy-signal-ttl"
                role="presentation"
                aria-hidden
                style={{ "--ttl-pct": `${ttlPct}%` } as CSSProperties}
              >
                <span className="marketing-copy-signal-ttl-fill" />
              </div>

              <p className="marketing-copy-signal-note">{signal.note}</p>

              <div className="marketing-copy-signal-stakes">
                <p>
                  <span className="marketing-copy-signal-stake-label font-mono">They suggest</span>
                  <span className="marketing-copy-signal-stake-value">{signal.stakeSuggested}</span>
                </p>
                <p>
                  <span className="marketing-copy-signal-stake-label font-mono">You’d stake</span>
                  <span className="marketing-copy-signal-stake-value">{signal.stakeEffective}</span>
                </p>
              </div>

              <p className="marketing-copy-signal-confidence font-mono">
                {signal.confidence}% confidence on this call
              </p>
            </div>

            <div className="marketing-copy-risk">
              <p className="marketing-copy-risk-lead">
                Copy limits sit on their own book — so a rough copy day doesn’t wipe your manual
                session.
              </p>
              <ul className="marketing-copy-risk-list">
                {COPY_PANEL.risk.map((row) => (
                  <li key={row.label}>
                    <span className="marketing-copy-risk-label font-mono">{row.label}</span>
                    <span className="marketing-copy-risk-value">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <div className="marketing-copy-cta-banner">
          <div className="marketing-copy-cta-inner">
            <Copy className="h-6 w-6 text-accent" strokeWidth={1.5} />
            <div className="marketing-copy-cta-text">
              <p className="marketing-panel-actions-title">{COPY_PANEL.ctaTitle}</p>
              <p className="marketing-panel-actions-body">{COPY_PANEL.ctaBody}</p>
            </div>
          </div>
          <MarketingAuthButtons size="lg" className="marketing-panel-actions-auth" />
        </div>
      </div>
    </section>
  );
}
