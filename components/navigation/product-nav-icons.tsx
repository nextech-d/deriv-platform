import type { ReactNode } from "react";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="tc-nav-glyph">
      {children}
    </svg>
  );
}

const a = { className: "tc-nav-fill" } as const;
const b = { className: "tc-nav-fill-2" } as const;
const cut = { fill: "#fff" } as const;

const ICONS: Partial<Record<PlatformNavId, () => ReactNode>> = {
  dashboard: () => (
    <Glyph>
      <rect {...a} x="2" y="2" width="9.2" height="9.2" rx="2.2" />
      <rect {...b} x="12.8" y="2" width="9.2" height="6.2" rx="2.2" />
      <rect {...b} x="2" y="12.8" width="9.2" height="9.2" rx="2.2" />
      <rect {...a} x="12.8" y="9.8" width="9.2" height="12.2" rx="2.2" />
    </Glyph>
  ),
  "bot-builder": () => (
    <Glyph>
      <rect {...b} x="11" y="1.6" width="2" height="3.4" rx="1" />
      <circle {...a} cx="12" cy="1.8" r="1.5" />
      <rect {...a} x="4" y="5.8" width="16" height="12.2" rx="3.4" />
      <circle {...cut} cx="9" cy="11.2" r="2.05" />
      <circle {...cut} cx="15" cy="11.2" r="2.05" />
      <rect {...cut} x="8.6" y="14.8" width="6.8" height="1.5" rx="0.75" />
      <rect {...b} x="7.2" y="18.6" width="9.6" height="3.6" rx="1.8" />
    </Glyph>
  ),
  "free-bots": () => (
    <Glyph>
      <rect {...a} x="10.15" y="2" width="3.7" height="20" rx="1.2" />
      <rect
        {...a}
        x="10.15"
        y="2"
        width="3.7"
        height="20"
        rx="1.2"
        transform="rotate(45 12 12)"
      />
      <rect
        {...a}
        x="10.15"
        y="2"
        width="3.7"
        height="20"
        rx="1.2"
        transform="rotate(90 12 12)"
      />
      <rect
        {...a}
        x="10.15"
        y="2"
        width="3.7"
        height="20"
        rx="1.2"
        transform="rotate(135 12 12)"
      />
      <circle {...a} cx="12" cy="12" r="6.1" />
      <circle {...cut} cx="12" cy="12" r="2.7" />
      <circle {...a} cx="18.4" cy="5.6" r="3.3" />
      <path
        d="M16.95 5.65 18.05 6.75 20 4.7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Glyph>
  ),
  "d-trader": () => (
    <Glyph>
      <rect {...b} x="5.1" y="2.4" width="2.2" height="19.2" rx="1.1" />
      <rect {...b} x="16.7" y="2.4" width="2.2" height="19.2" rx="1.1" />
      <rect {...a} x="3.4" y="7.2" width="5.6" height="8.4" rx="1.4" />
      <rect {...a} x="15" y="9.4" width="5.6" height="6.2" rx="1.4" />
    </Glyph>
  ),
  "analysis-tool": () => (
    <Glyph>
      <rect {...b} x="2" y="13.4" width="3.6" height="8.2" rx="1.2" />
      <rect {...a} x="6.4" y="8.2" width="3.6" height="13.4" rx="1.2" />
      <rect {...b} x="10.8" y="10.8" width="3.6" height="10.8" rx="1.2" />
      <circle {...a} cx="17.6" cy="8.2" r="4.3" />
      <circle {...cut} cx="17.6" cy="8.2" r="2.15" />
      <rect
        {...a}
        x="19.4"
        y="11.6"
        width="4.4"
        height="2.1"
        rx="1.05"
        transform="rotate(42 21.6 12.65)"
      />
    </Glyph>
  ),
  "signal-center": () => (
    <Glyph>
      <path
        {...b}
        d="M3.2 10.2a12.2 12.2 0 0 1 17.6 0l-2.35 1.85a9.1 9.1 0 0 0-12.9 0z"
      />
      <path
        {...a}
        d="M6.4 13.6a7.6 7.6 0 0 1 11.2 0l-2.3 1.8a4.6 4.6 0 0 0-6.6 0z"
      />
      <circle {...a} cx="12" cy="19.2" r="2.15" />
    </Glyph>
  ),
  "money-management": () => (
    <Glyph>
      <rect {...a} x="2" y="5.4" width="20" height="13.4" rx="2.6" />
      <rect {...b} x="2" y="5.4" width="20" height="4.2" rx="2.6" />
      <rect {...b} x="2" y="8.2" width="20" height="1.6" />
      <circle {...cut} cx="12" cy="13.8" r="2.7" />
      <circle {...b} cx="12" cy="13.8" r="1.35" />
    </Glyph>
  ),
  "copy-trading": () => (
    <Glyph>
      <circle {...b} cx="16.2" cy="8" r="3.15" />
      <path {...b} d="M21.6 19.8c-.5-2.85-2.45-4.7-4.7-4.7-1.7 0-3.15.95-3.95 2.45V19.8z" />
      <circle {...a} cx="8.8" cy="7.6" r="3.7" />
      <path {...a} d="M2.6 19.8c.65-3.85 3.4-6.2 6.2-6.2s5.55 2.35 6.2 6.2z" />
    </Glyph>
  ),
  edging: () => (
    <Glyph>
      <path {...b} d="m3.4 8.2 8.6-4.4 8.6 4.4-8.6 4.4z" />
      <path {...a} d="m3.4 12.1 8.6 4.4 8.6-4.4-8.6-4.4z" />
      <path {...b} d="m3.4 16 8.6 4.4 8.6-4.4-8.6-4.4z" />
    </Glyph>
  ),
  "edging-2": () => (
    <Glyph>
      <path {...b} d="m2.6 8 7.8-4 7.8 4-7.8 4z" />
      <path {...a} d="m2.6 12 7.8 4 7.8-4-7.8-4z" />
      <circle {...a} cx="18.4" cy="18.2" r="3.6" />
      <path
        d="M18.4 16.5v3.4M16.7 18.2h3.4"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Glyph>
  ),
  "fast-trader": () => (
    <Glyph>
      <path {...b} d="M13.6 1.8 3.4 13.6h7.6L8.4 22.2l11.8-13.4h-7.4z" />
      <path {...a} d="M13.2 4.4 6.2 13.2h5.4L9.6 19.6 18.6 10.8h-5.2z" />
    </Glyph>
  ),
  chart: () => (
    <Glyph>
      <path
        {...b}
        d="M4.2 19.4V5h2.2v7.8l2.6-3.4 3 2.4 5.8-7.2 1.7 1.35-7.2 8.9-3.05-2.45-2.65 3.45H19.8v2.15z"
      />
      <rect {...a} x="3.8" y="18.6" width="16.6" height="2.4" rx="1.2" />
      <rect {...a} x="3.8" y="4.6" width="2.4" height="16.4" rx="1.2" />
    </Glyph>
  ),
  "ultimate-bot": () => (
    <Glyph>
      <path
        {...b}
        d="M12 2.4c2.6 3.2 6.6 6.2 6.6 11 0 3.6-2.9 6.4-6.6 6.4S5.4 17 5.4 13.4c0-4.8 4-7.8 6.6-11z"
      />
      <path
        {...a}
        d="M12 6.2c-2.5 2.8-3.8 4.9-3.8 7.2 0 2.2 1.7 4 3.8 4s3.8-1.8 3.8-4c0-2.3-1.3-4.4-3.8-7.2z"
      />
      <path
        {...cut}
        d="M12 11.4c.7.85 1.15 1.45 1.15 2.3 0 .8-.5 1.45-1.15 1.45s-1.15-.65-1.15-1.45c0-.85.45-1.45 1.15-2.3z"
      />
    </Glyph>
  ),
  "bulk-trader": () => (
    <Glyph>
      <rect {...b} x="2.2" y="2.2" width="8.6" height="8.6" rx="2.2" />
      <rect {...a} x="13.2" y="2.2" width="8.6" height="8.6" rx="2.2" />
      <rect {...a} x="2.2" y="13.2" width="8.6" height="8.6" rx="2.2" />
      <rect {...b} x="13.2" y="13.2" width="8.6" height="8.6" rx="2.2" />
    </Glyph>
  ),
};

export function ProductNavIcon({ id }: { id: PlatformNavId }) {
  return (ICONS[id] ?? ICONS.dashboard)!();
}
