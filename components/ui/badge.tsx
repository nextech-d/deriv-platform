import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-surface-elevated text-muted border-border",
  success: "bg-positive/10 text-positive border-positive/25",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-negative/10 text-negative border-negative/25",
  accent: "bg-accent/10 text-accent border-accent/25",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
  dot,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
      ) : null}
      {children}
    </span>
  );
}
