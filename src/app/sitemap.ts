import type { MetadataRoute } from "next";

/**
 * The home page and its Arabic mirror (src/app/ar/page.tsx) — the only two
 * genuinely public, content-bearing URLs in this app. Login/signup carry no
 * unique search value over them, and everything else is behind auth and
 * already excluded via robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.BETTER_AUTH_URL!;

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: { en: base, ar: `${base}/ar` } },
    },
    {
      url: `${base}/ar`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: { en: base, ar: `${base}/ar` } },
    },
  ];
}
