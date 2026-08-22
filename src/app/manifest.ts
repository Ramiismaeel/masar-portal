import type { MetadataRoute } from "next";

/**
 * Next.js auto-detects this file and serves it at /manifest.webmanifest,
 * auto-linking it from every page's <head> — no manual <link rel="manifest">
 * needed anywhere.
 *
 * Icons are a placeholder: generated from the existing email wordmark
 * (masar-logo.png, a wide header logo) composited onto a brand-green square,
 * not a purpose-built app icon. Swap public/icon-*.png for real ones when
 * Masar has a proper mark. See docs/roadmap.md "PWA".
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masar Portal",
    short_name: "Masar",
    description:
      "Document checklist and upload portal for Masar Center visa applicants.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d4d35",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
