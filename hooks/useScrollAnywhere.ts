"use client";

import { useEffect } from "react";

const SCROLLABLE = /(auto|scroll|overlay)/;

function isElement(node: EventTarget | null): node is HTMLElement {
  return node instanceof HTMLElement;
}

function canScroll(el: HTMLElement, dx: number, dy: number): boolean {
  const style = getComputedStyle(el);
  const y = SCROLLABLE.test(style.overflowY);
  const x = SCROLLABLE.test(style.overflowX);
  if (dy && y) {
    const max = el.scrollHeight - el.clientHeight;
    if (dy > 0 && el.scrollTop < max - 1) return true;
    if (dy < 0 && el.scrollTop > 1) return true;
  }
  if (dx && x) {
    const max = el.scrollWidth - el.clientWidth;
    if (dx > 0 && el.scrollLeft < max - 1) return true;
    if (dx < 0 && el.scrollLeft > 1) return true;
  }
  return false;
}

function ancestors(start: EventTarget | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let node: HTMLElement | null = isElement(start)
    ? start
    : start instanceof Node
      ? start.parentElement
      : null;
  while (node && node !== document.documentElement) {
    out.push(node);
    node = node.parentElement;
  }
  return out;
}

function fallbackPane(target: EventTarget | null, dx: number, dy: number): HTMLElement | null {
  const el = isElement(target)
    ? target
    : target instanceof Node
      ? target.parentElement
      : null;
  const desk = el?.closest<HTMLElement>("[data-desk]");
  const root = document.querySelector<HTMLElement>("[data-scroll-root]");
  const panes = [
    ...(desk
      ? desk.querySelectorAll<HTMLElement>("[data-scroll-pane]")
      : document.querySelectorAll<HTMLElement>("[data-scroll-pane]")),
    ...(root ? [root] : []),
    document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : document.documentElement,
  ];
  return panes.find((pane) => canScroll(pane, dx, dy)) ?? panes[0] ?? null;
}

let mounts = 0;

function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.defaultPrevented) return;
  const dx = event.deltaX;
  const dy = event.deltaY;
  if (!dx && !dy) return;

  const target = event.target;
  if (
    isElement(target) &&
    target.closest("input, textarea, select, [contenteditable='true'], [data-scroll-lock]")
  ) {
    return;
  }

  if (ancestors(target).some((node) => canScroll(node, dx, dy))) return;

  const pane = fallbackPane(target, dx, dy);
  if (!pane) return;

  const beforeY = pane.scrollTop;
  const beforeX = pane.scrollLeft;
  pane.scrollTop += dy;
  pane.scrollLeft += dx;
  if (pane.scrollTop !== beforeY || pane.scrollLeft !== beforeX) {
    event.preventDefault();
  }
}

/** Wheel over charts, toolbars, and overflow:hidden panes still moves the nearest desk scroller. */
export function useScrollAnywhere() {
  useEffect(() => {
    mounts += 1;
    if (mounts === 1) {
      document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    }
    return () => {
      mounts -= 1;
      if (mounts === 0) {
        document.removeEventListener("wheel", onWheel, true);
      }
    };
  }, []);
}
