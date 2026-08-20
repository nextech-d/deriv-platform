"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PLATFORM_NAV_GROUPS,
  PLATFORM_NAV_ITEMS,
  type AppView,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { cn } from "@/lib/utils/cn";

export type PlatformNavRailVariant = "marketing" | "terminal";

interface PlatformNavRailProps {
  activeId: AppView | PlatformNavId;
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
      track.scrollLeft += event.deltaY;
    };

    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, [variant, className]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const active = track.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        setIndicator({ width: 0, x: 0 });
        return null;
      }
      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      setIndicator({
        width: activeRect.width,
        x: activeRect.left - trackRect.left,
      });
      return active;
    };

    const active = measure();
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });

    const ro = new ResizeObserver(measure);
    ro.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      track.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
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
            {PLATFORM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              return (
                <li key={item.id} className="platform-nav-rail-marketing-item">
                  <button
                    type="button"
                    className={cn(
                      "platform-nav-rail-item interactive",
                      isActive && "platform-nav-rail-item-active",
                    )}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                    onClick={() =>
                      onSectionNavigate?.(item.sectionId, item.id)
                    }
                  >
                    <span className="platform-nav-rail-icon-wrap" aria-hidden>
                      <Icon className="platform-nav-rail-icon" strokeWidth={2.1} />
                    </span>
                    <span className="platform-nav-rail-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
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
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          "platform-nav-rail-item interactive",
                          isActive && "platform-nav-rail-item-active",
                        )}
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
