import { cn } from "@/lib/utils/cn";

const variants = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-[0_1px_2px_rgb(24_24_27/0.08),0_4px_12px_rgb(225_29_72/0.2)]",
  secondary:
    "bg-surface text-foreground border border-border shadow-control hover:border-border hover:bg-surface-elevated",
  ghost: "text-muted hover:text-foreground hover:bg-surface-elevated",
  danger: "bg-negative/15 text-negative border border-negative/30 hover:bg-negative/25",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium interactive disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
