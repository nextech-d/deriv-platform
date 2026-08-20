"use client";

import { ArrowRight } from "lucide-react";
import { HOME_SECTIONS, HOME_WORKSPACES } from "@/lib/marketing/home-content";
import { platformSectionIdFromNavId, type PlatformNavId } from "@/lib/navigation/platform-nav";

interface MarketingHomeWorkspacesSectionProps {
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

const DESK_GROUPS = ["Build", "Trade", "Learn"] as const;

type DeskGroup = (typeof DESK_GROUPS)[number];

function workspaceSectionId(id: PlatformNavId): string {
  return platformSectionIdFromNavId(id);
}

function DeskWorkspaceGroup({
  group,
  items,
  onNavigate,
}: {
  group: DeskGroup;
  items: (typeof HOME_WORKSPACES)[number][];
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}) {
  return (
    <section className="marketing-desk-column" data-group={group}>
      <header className="marketing-desk-column-head">
        <span className="marketing-desk-column-label font-mono">{group}</span>
        <span className="marketing-desk-column-rule" aria-hidden />
      </header>

      <ul className="marketing-desk-list marketing-instrument-rows">
        {items.map((item) => {
          const Icon = item.icon;
          const sectionId = workspaceSectionId(item.id);

          const rowBody = (
            <>
              <div className="marketing-instrument-row-mark">
                <span className="marketing-instrument-row-icon marketing-desk-row-icon" aria-hidden>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              </div>

              <div className="marketing-instrument-row-copy marketing-desk-row-copy">
                <div className="marketing-instrument-row-title marketing-desk-title-row">
                  <h3 className="marketing-desk-title">{item.title}</h3>
                  <span className="marketing-desk-tagline font-mono">{item.tag}</span>
                </div>
                <p className="marketing-desk-body">{item.body}</p>
              </div>

              <footer className="marketing-instrument-row-foot marketing-desk-foot">
                <span className="marketing-desk-link">
                  Open
                  <ArrowRight className="h-3 w-3" strokeWidth={2} />
                </span>
              </footer>
            </>
          );

          return (
            <li key={item.id} className="marketing-desk-item">
              {onNavigate ? (
                <button
                  type="button"
                  className="marketing-instrument-row marketing-desk-row marketing-desk-row-action interactive"
                  data-nav={item.id}
                  onClick={() => onNavigate(sectionId, item.id)}
                >
                  {rowBody}
                </button>
              ) : (
                <article className="marketing-instrument-row marketing-desk-row" data-nav={item.id}>
                  {rowBody}
                </article>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MarketingHomeWorkspacesSection({
  onNavigate,
}: MarketingHomeWorkspacesSectionProps) {
  const workspacesByGroup = DESK_GROUPS.map((group) => ({
    group,
    items: HOME_WORKSPACES.filter((item) => item.group === group),
  }));

  return (
    <section className="marketing-home-section marketing-home-workspaces">
      <header className="marketing-desk-intro">
        <div className="marketing-desk-intro-copy">
          <p className="marketing-eyebrow">{HOME_SECTIONS.platform.eyebrow}</p>
          <h2 className="marketing-desk-intro-title">{HOME_SECTIONS.platform.title}</h2>
          <p className="marketing-desk-intro-lead">{HOME_SECTIONS.platform.lead}</p>
        </div>
      </header>

      <div className="marketing-desk">
        <div className="marketing-desk-map">
          <div className="marketing-desk-map-split">
            {workspacesByGroup.map(({ group, items }) =>
              items.length > 0 ? (
                <DeskWorkspaceGroup
                  key={group}
                  group={group}
                  items={items}
                  onNavigate={onNavigate}
                />
              ) : null,
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
