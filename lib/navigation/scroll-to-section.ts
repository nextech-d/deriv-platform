const NAV_OFFSET_VAR = "--marketing-nav-offset";
const NAV_CLEARANCE_PX = 12;
const DEFAULT_OFFSET_PX = 96;

export function getNavScrollOffset(): number {
  if (typeof window === "undefined") return DEFAULT_OFFSET_PX;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(NAV_OFFSET_VAR)
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_OFFSET_PX;
}

export function measureNavScrollOffset(
  headerEl?: HTMLElement | null,
): number {
  if (headerEl) {
    const { bottom } = headerEl.getBoundingClientRect();
    return Math.ceil(bottom + NAV_CLEARANCE_PX);
  }
  return getNavScrollOffset();
}

export function setNavScrollOffset(px: number) {
  const value = `${Math.ceil(px)}px`;
  document.documentElement.style.setProperty(NAV_OFFSET_VAR, value);
}

export function scrollToPlatformSection(
  sectionId: string,
  behavior: ScrollBehavior = "smooth",
  headerEl?: HTMLElement | null,
): boolean {
  const target = document.getElementById(sectionId);
  if (!target) return false;

  const offset = measureNavScrollOffset(headerEl);
  setNavScrollOffset(offset);

  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });

  return true;
}

export function readSectionIdFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "").trim();
  return hash || null;
}
