import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Tighter layout for embedded workspace panels */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "desk-empty rounded-md border border-dashed border-border-subtle px-4 py-8 text-center",
          className,
        )}
      >
        <Icon className="mx-auto h-4 w-4 text-muted" strokeWidth={1.75} />
        <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 text-[10px] text-muted">{description}</p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-elevated/50 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface shadow-control">
        <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} />
      </div>
      <p className="type-title text-foreground">{title}</p>
      {description ? (
        <p className="type-caption mt-1 max-w-xs">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  bar?: number;
  warn?: boolean;
  className?: string;
  /** Match session stats / terminal studio tiles */
  variant?: "default" | "terminal";
}

export function StatTile({
  label,
  value,
  sub,
  trend,
  bar,
  warn,
  className,
  variant = "default",
}: StatTileProps) {
  const isTerminal = variant === "terminal";

  return (
    <div
      className={cn(
        isTerminal
          ? "terminal-stat px-3 py-2.5"
          : "rounded-lg border border-border-subtle bg-surface px-3 py-2.5 shadow-control",
        className,
      )}
    >
      <p
        className={cn(
          isTerminal
            ? "terminal-section-label"
            : "text-[10px] font-medium uppercase tracking-wide text-muted",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm font-semibold tabular-nums",
          isTerminal && "mt-1.5 text-base",
          trend === "up" && "text-positive",
          trend === "down" && "text-negative",
          warn && !trend && "text-warning",
        )}
      >
        {value}
      </p>
      {sub ? <p className="text-[10px] text-muted">{sub}</p> : null}
      {bar !== undefined ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border-subtle">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              warn ? "bg-warning" : "bg-accent/60",
            )}
            style={{ width: `${bar}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
