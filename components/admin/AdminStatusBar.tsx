"use client";

interface AdminStatusBarProps {
  hints: Array<{ keys: string; label: string }>;
}

export function AdminStatusBar({ hints }: AdminStatusBarProps) {
  return (
    <div className="admin-status-bar shrink-0">
      <div className="admin-status-bar-inner mx-auto w-full max-w-[1240px] px-4 md:px-6">
        {hints.map((hint, index) => (
          <span key={hint.label} className="admin-status-hint">
            {hint.keys.split(" ").map((key, keyIndex) => (
              <span key={`${hint.label}-${key}-${keyIndex}`}>
                {keyIndex > 0 ? " " : null}
                <kbd className="admin-status-kbd">{key}</kbd>
              </span>
            ))}{" "}
            {hint.label}
            {index < hints.length - 1 ? (
              <span className="admin-status-sep" aria-hidden>
                ·
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
