import { MarketingAuthButtons } from "@/components/marketing/MarketingAuthButtons";
import { MarketingCopyPanel } from "@/components/marketing/MarketingCopyPanel";
import { PLATFORM_SECTIONS } from "@/lib/marketing/platform-sections";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";
import { platformSectionIdFromNavId } from "@/lib/navigation/platform-nav";

interface MarketingPlatformPanelProps {
  navId: Exclude<PlatformNavId, "home">;
}

export function MarketingPlatformPanel({ navId }: MarketingPlatformPanelProps) {
  if (navId === "copy") {
    return <MarketingCopyPanel />;
  }

  const sectionId = platformSectionIdFromNavId(navId);
  const section = PLATFORM_SECTIONS.find((entry) => entry.sectionId === sectionId);

  if (!section) return null;

  const Icon = section.icon;

  return (
    <section
      id={section.sectionId}
      className="marketing-workspace-section marketing-panel"
      data-panel={section.sectionId}
      tabIndex={-1}
    >
      <div className="marketing-stagger">
        <header className="marketing-panel-head">
          <div className="marketing-panel-kicker">
            <p className="marketing-eyebrow">{section.eyebrow}</p>
            <p className="marketing-panel-meta font-mono">
              <span>{section.features.length} capabilities</span>
              <span aria-hidden>·</span>
              <span>Workspace</span>
            </p>
          </div>

          <h1 className="marketing-panel-title">{section.title}</h1>
          <p className="marketing-panel-summary">{section.summary}</p>
          <p className="marketing-panel-lead">{section.body}</p>

          <ul className="marketing-panel-chips" aria-label={`${section.eyebrow} highlights`}>
            {section.meta.map((chip) => (
              <li key={chip} className="marketing-panel-chip font-mono">
                {chip}
              </li>
            ))}
          </ul>
        </header>

        <div className="marketing-panel-grid">
          <div className="marketing-panel-main">
            <p className="marketing-panel-section-label font-mono">What you get</p>
            <ul className="marketing-feature-list">
              {section.features.map((feature, index) => (
                <li key={feature.label} className="marketing-feature-item">
                  <span className="marketing-feature-index font-mono" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="marketing-feature-copy">
                    <h2 className="marketing-feature-label">{feature.label}</h2>
                    <p className="marketing-feature-detail">{feature.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="marketing-panel-preview" aria-label={`${section.eyebrow} desk preview`}>
            <div className="marketing-panel-preview-head">
              <span className="marketing-panel-preview-icon" aria-hidden>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="marketing-panel-preview-titles">
                <div>
                  <p className="marketing-panel-preview-label">{section.preview.kicker}</p>
                  <p className="marketing-panel-preview-sub">Illustrative desk snapshot</p>
                </div>
                <p className="marketing-panel-preview-status font-mono">
                  <span className="marketing-panel-preview-beacon" aria-hidden />
                  {section.preview.status}
                </p>
              </div>
            </div>

            <dl className="marketing-panel-preview-body">
              {section.preview.rows.map((row) => (
                <div key={row.key} className="marketing-panel-preview-row">
                  <dt className="marketing-panel-preview-key font-mono">{row.key}</dt>
                  <dd className="marketing-panel-preview-value">{row.value}</dd>
                </div>
              ))}
            </dl>

            <footer className="marketing-panel-preview-foot font-mono">
              Open the terminal to use live {section.eyebrow.toLowerCase()} controls
            </footer>
          </aside>
        </div>

        <div className="marketing-panel-actions">
          <div className="marketing-panel-actions-copy">
            <p className="marketing-panel-actions-title">Open this workspace</p>
            <p className="marketing-panel-actions-body">
              Log in or sign up with Deriv, then jump straight into the {section.eyebrow} desk.
            </p>
          </div>
          <MarketingAuthButtons size="lg" className="marketing-panel-actions-auth" />
        </div>
      </div>
    </section>
  );
}
