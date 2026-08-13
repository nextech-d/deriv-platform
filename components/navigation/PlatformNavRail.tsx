"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PLATFORM_NAV_GROUPS,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { cn } from "@/lib/utils/cn";

export type PlatformNavRailVariant = "marketing" | "terminal";

interface PlatformNavRailProps {
  activeId: PlatformNavId;
  variant?: PlatformNavRailVariant;
  onNavigate?: (id: PlatformNavId) => void;
  onSectionNavigate?: (sectionId: string, id: PlatformNavId) => void;
  className?: string;
  labelledBy?: string;
}

export function PlatformNavRail({
  activeId,
  variant = "marketing",
  onNavigate,
  onSectionNavigate,
  className,
  labelledBy,
}: PlatformNavRailProps) {
  const isTerminal = variant === "terminal";
  const isMarketing = variant === "marketing";
  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ width: 0, x: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (track.scrollWidth <= track.clientWidth + 1) return;

      event.preventDefault();
      if (isTerminal) {
        track.scrollLeft += event.deltaY;
        return;
      }
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    };

    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, [variant, className, isTerminal]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const sync = () => {
      const active = track.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        setIndicator({ width: 0, x: 0 });
        return;
      }
      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      setIndicator({
        width: activeRect.width,
        x: activeRect.left - trackRect.left,
      });
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(track);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [activeId, className, variant]);

  return (
    <nav
      className={cn(
        "platform-nav-rail",
        isMarketing && "platform-nav-rail-marketing",
        isTerminal && "platform-nav-rail-terminal",
        className,
      )}
      aria-label={labelledBy ?? "Platform navigation"}
    >
      <div ref={trackRef} className="platform-nav-rail-track">
        <span
          className="platform-nav-indicator"
          aria-hidden
          style={{
            width: indicator.width,
            opacity: indicator.width > 0 ? 1 : 0,
            transform: `translateX(${indicator.x}px)`,
          }}
        />
        {isMarketing ? (
          <ul className="platform-nav-rail-list platform-nav-rail-list-marketing">
            {PLATFORM_NAV_GROUPS.flatMap((group) => group.items).map(
              (item, index) => {
                const isActive = activeId === item.id;
                return (
                  <li key={item.id} className="platform-nav-rail-marketing-item">
                    {index > 0 ? (
                      <span className="platform-nav-rail-sep" aria-hidden>
                        /
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={cn(
                        "platform-nav-rail-item interactive",
                        isActive && "platform-nav-rail-item-active",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() =>
                        onSectionNavigate?.(item.sectionId, item.id)
                      }
                    >
                      <span className="platform-nav-rail-label">{item.label}</span>
                    </button>
                  </li>
                );
              },
            )}
          </ul>
        ) : (
          PLATFORM_NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="platform-nav-rail-group">
              {groupIndex > 0 ? (
                <span className="platform-nav-rail-gap" aria-hidden />
              ) : null}
              <ul className="platform-nav-rail-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeId === item.id;
                  const classNames = cn(
                    "platform-nav-rail-item interactive",
                    isActive && "platform-nav-rail-item-active",
                  );

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={classNames}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => onNavigate?.(item.id)}
                      >
                        <Icon className="platform-nav-rail-icon" strokeWidth={2} />
                        <span className="platform-nav-rail-label">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </nav>
  );
}
