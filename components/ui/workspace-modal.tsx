"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

interface WorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible name when `labelledBy` is not set */
  label: string;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  slotClassName?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export function WorkspaceModal({
  open,
  onClose,
  children,
  label,
  labelledBy,
  describedBy,
  className,
  slotClassName,
  size = "md",
}: WorkspaceModalProps) {
  const [mounted, setMounted] = useState(false);
  const fallbackLabelId = useId();
  const titleId = labelledBy ?? fallbackLabelId;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("workspace-modal-open");
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove("workspace-modal-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn("workspace-modal-backdrop", className)}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy ? titleId : undefined}
      aria-describedby={describedBy}
      onClick={onClose}
    >
      {!labelledBy ? (
        <span id={fallbackLabelId} className="sr-only">
          {label}
        </span>
      ) : null}
      <div
        className={cn("workspace-modal-slot", SIZE_CLASS[size], slotClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Standard modal chrome — matches admin delete confirm. */
export function WorkspaceModalFrame({
  title,
  titleId,
  children,
  footer,
  className,
  bodyClassName,
}: {
  title: string;
  titleId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("workspace-modal-panel", className)}>
      <div className="workspace-panel-head border-b border-border-subtle">
        <div className="workspace-tab min-w-0 flex-1" data-active="true">
          {titleId ? <span id={titleId}>{title}</span> : title}
        </div>
      </div>
      <div className={cn("workspace-pane", bodyClassName)}>
        {children}
        {footer ? <div className="mt-4 flex gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
