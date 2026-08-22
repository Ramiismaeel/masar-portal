"use client";

import { useEffect } from "react";

/**
 * @serwist/next's webpack plugin auto-injects a registration script — the
 * Turbopack route-handler path (src/app/[path]/route.ts) doesn't, so this
 * does it by hand with the plain browser API. No `@serwist/window` needed
 * for something this small.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
