"use client";

import { useCallback, useEffect, useRef } from "react";
import { ProductNavbar } from "@/components/navigation/ProductChrome";
import {
  platformSectionIdFromNavId,
  platformSectionHref,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { setNavScrollOffset } from "@/lib/navigation/scroll-to-section";
import { writeFreeBotsTier, clearBuilderHandoff } from "@/lib/terminal/desk-handoff";

interface MarketingNavbarProps {
  activeId: PlatformNavId;
  onNavigate: (sectionId: string, id: PlatformNavId) => void;
}

export function MarketingNavbar({
  activeId,
  onNavigate,
}: MarketingNavbarProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  const syncNavOffset = useCallback(() => {
    const header = headerRef.current;
    if (!header) return;
    setNavScrollOffset(header.getBoundingClientRect().height);
  }, []);

  useEffect(() => {
    syncNavOffset();
    const header = headerRef.current;
    if (!header) return;
    const ro = new ResizeObserver(() => syncNavOffset());
    ro.observe(header);
    window.addEventListener("resize", syncNavOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncNavOffset);
    };
  }, [syncNavOffset]);

  return (
    <div ref={headerRef} className="tc-chrome-fixed">
      <ProductNavbar
        brandHref={platformSectionHref("overview")}
        activeId={activeId}
        onSelect={(id) => {
          if (id === "free-bots") writeFreeBotsTier("free");
          if (id === "bot-builder") clearBuilderHandoff();
          onNavigate(platformSectionIdFromNavId(id), id);
        }}
      />
    </div>
  );
}
