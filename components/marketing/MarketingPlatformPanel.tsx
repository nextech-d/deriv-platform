import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_SECTIONS } from "@/lib/marketing/platform-sections";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";
import { platformSectionIdFromNavId } from "@/lib/navigation/platform-nav";

interface MarketingPlatformPanelProps {
  navId: Exclude<PlatformNavId, "home">;
  terminalHref: string;
}

export function MarketingPlatformPanel({
  navId,
  terminalHref,
}: MarketingPlatformPanelProps) {
  const sectionId = platformSectionIdFromNavId(navId);
  const section = PLATFORM_SECTIONS.find((entry) => entry.sectionId === sectionId);

  if (!section) return null;

  const Icon = section.icon;

  return (
    <section
      id={section.sectionId}
      className="marketing-workspace-section marketing-panel"
      tabIndex={-1}
    >
      <div className="marketing-stagger">
        <header className="marketing-panel-head">
          <p className="marketing-eyebrow">{section.eyebrow}</p>
          <h1 className="marketing-panel-title">{section.title}</h1>
          <p className="marketing-panel-lead">{section.body}</p>
        </header>

        <div className="marketing-panel-grid">
          <ul className="marketing-feature-list">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="marketing-feature-item">
                {bullet}
              </li>
            ))}
          </ul>

          <div className="marketing-frame marketing-panel-preview">
            <div className="marketing-panel-preview-head">
              <span className="marketing-panel-preview-icon">
                <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
              </span>
              <div>
                <p className="marketing-panel-preview-label">{section.eyebrow}</p>
                <p className="marketing-panel-preview-sub">{section.title}</p>
              </div>
            </div>
            <div className="marketing-panel-preview-body">
              {section.bullets.map((bullet, index) => (
                <div key={bullet} className="marketing-panel-preview-row">
                  <span className="marketing-panel-preview-index font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="marketing-panel-actions">
          <Link href={terminalHref} className="inline-flex">
            <Button size="lg" className="interactive gap-2">
              Open {section.eyebrow} in terminal
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
