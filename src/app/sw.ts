import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * `defaultCache` (from @serwist/next) is doing the real work here, not
 * hand-picked runtime rules — it's Next.js-App-Router-aware out of the box:
 * NetworkFirst for RSC/HTML navigations and /api/* (so nothing authenticated
 * or personal is ever served stale while actually online — the cache is a
 * fallback for offline, never a substitute for a live request), CacheFirst/
 * StaleWhileRevalidate for static build assets and fonts, and an explicit
 * carve-out for /api/auth/* so the auth callback flow isn't intercepted.
 * This is exactly the caching philosophy this app needs (documents,
 * sessions — nothing here should be served from a stale cache while a real
 * connection exists), and it's already been through more real-world use
 * than anything hand-rolled here would get.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
