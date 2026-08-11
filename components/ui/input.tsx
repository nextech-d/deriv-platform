"use client";

import { cn } from "@/lib/utils/cn";

const base =
  "rounded-lg border border-border bg-surface shadow-control transition-all duration-150 ease-out outline-none focus:border-accent/40 focus:ring-[3px] focus:ring-accent/10";

export function inputClassName(className?: string) {
  return cn(base, className);
}

export function chipClassName(active: boolean, className?: string) {
  return cn(
    "shrink-0 rounded-lg border px-3 py-2 text-left transition-all duration-150 ease-out",
    active
      ? "border-accent/45 bg-accent/10 text-accent shadow-control"
      : "border-border bg-surface shadow-control text-muted hover:border-border hover:text-foreground",
    className,
  );
}

export function segmentClassName(active: boolean, className?: string) {
  return cn(
    "rounded-md px-2 py-0.5 text-[10px] font-medium transition-all duration-150 ease-out",
    active
      ? "bg-accent/12 text-accent shadow-sm"
      : "text-muted hover:bg-surface-elevated hover:text-foreground",
    className,
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ className, mono, ...props }: InputProps) {
  return (
    <input
      className={inputClassName(
        cn("h-10 w-full px-3 text-sm", mono && "font-mono", className),
      )}
      {...props}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select className={inputClassName(cn("h-10 px-3 text-sm", className))} {...props} />
  );
}
