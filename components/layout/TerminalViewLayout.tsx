import { cn } from "@/lib/utils/cn";

/** Shared padding for content inside desk panels. */
export const workspacePane = "workspace-pane px-3 py-3 md:px-4";

/** Primary column / section body padding */
export const deskContentPane = "desk-content-pane";

/** Action column padding — ticket, bot, agents */
export const deskActionPane = "desk-action-pane";

interface TerminalViewLayoutProps {
  alerts?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function TerminalViewLayout({
  alerts,
  stats,
  children,
  className,
}: TerminalViewLayoutProps) {
  return (
    <div className={cn("workspace-view space-y-3", className)}>
      {alerts ? <div className="space-y-2">{alerts}</div> : null}
      {stats}
      {children}
    </div>
  );
}

type DeskPanelVariant = "default" | "action" | "metrics";

interface DeskPanelProps {
  variant?: DeskPanelVariant;
  sticky?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function DeskPanel({
  variant = "default",
  sticky = false,
  className,
  children,
}: DeskPanelProps) {
  return (
    <div
      className={cn(
        "desk-panel",
        variant === "action" && "desk-panel-action",
        variant === "metrics" && "desk-panel-metrics",
        sticky && "sticky-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DeskPanelHead({
  title,
  hint,
  trailing,
  className,
}: {
  title: string;
  hint?: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("desk-head", className)}>
      <div className="desk-head-main min-w-0">
        <p className="desk-head-title">{title}</p>
        {hint ? <p className="desk-head-hint">{hint}</p> : null}
      </div>
      {trailing ? <div className="desk-head-trailing shrink-0">{trailing}</div> : null}
    </div>
  );
}

export function DeskSection({
  label,
  description,
  children,
  className,
  bordered = true,
}: {
  label?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section className={cn(bordered && "desk-section", className)}>
      {label ? (
        <div className="desk-section-head">
          <p className="desk-section-title">{label}</p>
          {description ? (
            <p className="desk-section-desc">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="desk-section-body">{children}</div>
    </section>
  );
}

interface TerminalSplitPanelProps {
  /** Optional — omit when sections or content self-describe */
  primaryLabel?: string;
  primaryHint?: string;
  primaryTrailing?: React.ReactNode;
  secondaryLabel: string;
  secondaryHint?: string;
  secondaryTrailing?: React.ReactNode;
  primary?: React.ReactNode;
  secondary: React.ReactNode;
  primarySections?: Array<{
    label?: string;
    description?: string;
    content: React.ReactNode;
  }>;
  primarySpan?: 1 | 2;
  className?: string;
}

export function TerminalSplitPanel({
  primaryLabel,
  primaryHint,
  primaryTrailing,
  secondaryLabel,
  secondaryHint,
  secondaryTrailing,
  primary,
  secondary,
  primarySections,
  primarySpan = 2,
  className,
}: TerminalSplitPanelProps) {
  const primaryCol = primarySpan === 2 ? "lg:col-span-2" : "lg:col-span-1";
  const secondaryCol = primarySpan === 1 ? "lg:col-span-2" : "lg:col-span-1";
  const showPrimaryHead = Boolean(primaryLabel) && !primarySections?.length;

  return (
    <div className={cn("workspace-split grid lg:grid-cols-3 lg:items-start", className)}>
      <DeskPanel className={primaryCol}>
        {showPrimaryHead ? (
          <DeskPanelHead
            title={primaryLabel!}
            hint={primaryHint}
            trailing={primaryTrailing}
          />
        ) : null}

        {primarySections ? (
          primarySections.map((section, index) => (
            <DeskSection
              key={section.label ?? index}
              label={section.label}
              description={section.description}
              bordered={index > 0 || Boolean(section.label)}
            >
              {section.content}
            </DeskSection>
          ))
        ) : (
          primary
        )}
      </DeskPanel>

      <DeskPanel variant="action" sticky className={secondaryCol}>
        <DeskPanelHead
          title={secondaryLabel}
          hint={secondaryHint}
          trailing={secondaryTrailing}
        />
        <div className="desk-body desk-body-action">{secondary}</div>
      </DeskPanel>
    </div>
  );
}

export function TerminalPanel({
  label,
  hint,
  children,
  action,
  className,
  bodyClassName,
  variant = "default",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: DeskPanelVariant;
}) {
  return (
    <DeskPanel variant={variant} className={className}>
      <DeskPanelHead title={label} hint={hint} trailing={action} />
      <div className={cn("desk-body", workspacePane, bodyClassName)}>{children}</div>
    </DeskPanel>
  );
}

interface TerminalStackedPanelProps {
  title?: string;
  sections: Array<{
    label?: string;
    description?: string;
    content: React.ReactNode;
  }>;
  className?: string;
}

export function TerminalStackedPanel({
  title,
  sections,
  className,
}: TerminalStackedPanelProps) {
  return (
    <DeskPanel className={className}>
      {title ? <DeskPanelHead title={title} /> : null}
      {sections.map((section, index) => (
        <DeskSection
          key={section.label ?? index}
          label={section.label}
          description={section.description}
          bordered={index > 0 || Boolean(section.label)}
        >
          {section.content}
        </DeskSection>
      ))}
    </DeskPanel>
  );
}
