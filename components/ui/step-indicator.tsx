import { cn } from "@/lib/utils/cn";

interface StepIndicatorProps {
  steps: string[];
  current: number;
  className?: string;
}

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={label} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                  active && "bg-accent text-white",
                  done && "bg-positive/15 text-positive",
                  !active && !done && "border border-border-subtle text-muted",
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-[10px] sm:inline",
                  active ? "font-medium text-foreground" : "text-muted",
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "mx-0.5 h-px w-3 sm:w-5",
                  index < current ? "bg-positive/40" : "bg-border-subtle",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
