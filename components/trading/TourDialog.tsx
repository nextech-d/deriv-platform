"use client";

import { useEffect } from "react";

interface TourDialogProps {
  title: string;
  body: React.ReactNode;
  onSkip: () => void;
  onStart: () => void;
}

export function TourDialog({ title, body, onSkip, onStart }: TourDialogProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div className="tc-tour" role="dialog" aria-modal="true" aria-labelledby="tc-tour-title" onClick={onSkip}>
      <div className="tc-tour-card" onClick={(event) => event.stopPropagation()}>
        <p id="tc-tour-title" className="tc-tour-title">
          {title}
        </p>
        <div className="tc-tour-body">{body}</div>
        <div className="tc-tour-actions">
          <button type="button" className="tc-btn tc-btn-ghost" onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="tc-btn tc-btn-solid" onClick={onStart}>
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
