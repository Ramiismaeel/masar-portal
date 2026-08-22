import type { MetadataRoute } from "next";

/**
 * Belt-and-suspenders with the noindex `robots` metadata on (app)/layout.tsx
 * and admin/layout.tsx — those stop an already-crawled page from being
 * *indexed*, this stops a crawler from *fetching* it at all. Neither alone
 * is enough: a robots.txt Disallow doesn't retroactively deindex a page
 * some other site already linked to, and a noindex meta tag only works if
 * the crawler actually requests the page to read it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/applications", "/admin", "/api"],
    },
    sitemap: `${process.env.BETTER_AUTH_URL}/sitemap.xml`,
  };
}
