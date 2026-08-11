"use client";

import { useEffect } from "react";

/** Registers the PWA service worker without showing an install prompt. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW optional in dev
    });
  }, []);

  return null;
}
