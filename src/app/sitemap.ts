import type { MetadataRoute } from "next";

/**
 * Just the home page — it's genuinely the only public, content-bearing URL
 * in this app. Login/signup carry no unique search value over it, and
 * everything else is behind auth and already excluded via robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: process.env.BETTER_AUTH_URL!,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
