import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { HomeContent } from "@/components/home-content";
import arMessages from "../../../messages/ar.json";

/**
 * A crawlable, always-Arabic mirror of / — exists solely so sharing the
 * portal in an Arabic-speaking channel gets a correct Arabic link preview
 * and so an Arabic search gets a page that's actually in Arabic. See
 * docs/roadmap.md "SEO" for why this is needed at all: the rest of the app
 * deliberately has ONE URL for both languages (a cookie-based switch, so
 * switching language never loses in-progress form state) — but a social
 * crawler makes one cookie-less request and only ever sees whatever the
 * default locale renders. There was no URL to point an Arabic share at, so
 * there was no way to get an Arabic preview no matter what the sharer's own
 * browser language was set to.
 *
 * This is the one deliberate exception to that single-URL design, scoped to
 * the home page only — not a reversal of it. The rest of the app (wizard,
 * checklist, dashboard, auth pages) still has exactly one URL per page.
 *
 * Two locale mechanisms, forced independently, same reasoning as admin's
 * English/LTR lock (src/app/admin/layout.tsx) but pointed the other way:
 * - `getTranslations({ locale: "ar", ... })`'s explicit-locale form for
 *   server-rendered strings (HomeContent takes `locale` as a plain prop,
 *   never reads the cookie itself).
 * - A nested `NextIntlClientProvider` pinned to "ar" for the one Client
 *   Component in the tree (LocaleSwitcher) that reads locale from context,
 *   not props.
 * `dir="rtl"`/`lang="ar"` are set on a wrapping div, not the root `<html>` —
 * the root layout's `<html>` still reflects the visitor's cookie (or its
 * default for a cookie-less crawler), which this page can't and shouldn't
 * try to override globally just for itself.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "ar", namespace: "Seo" });
  const title = t("title");
  const description = t("description");

  return {
    // `absolute`, not `default` — found live, not anticipated: a page-level
    // `title.template` only ever formats that page's OWN descendants, never
    // itself. /ar has none, so a `default` here instead would silently be
    // wrapped by the ROOT layout's ENGLISH template (cookie-derived, and
    // there's no cookie for a crawler) — producing "بوابة مسار | Masar
    // Portal", two languages in one tag. `absolute` is Next's documented
    // escape hatch to ignore every ancestor template, which is exactly what
    // a fixed-locale page needs.
    title: { absolute: title },
    description,
    keywords: t("keywords"),
    alternates: {
      canonical: "/ar",
      languages: { en: "/", ar: "/ar", "x-default": "/" },
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "Masar Portal",
      locale: "ar_SY",
      images: [
        {
          url: "/og-image.webp",
          width: 1200,
          height: 630,
          alt: "Masar Center — German visa consulting",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.webp"],
    },
  };
}

export default async function ArabicHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = Boolean(session?.user);

  return (
    <NextIntlClientProvider locale="ar" messages={arMessages}>
      <div lang="ar" dir="rtl">
        <HomeContent isSignedIn={isSignedIn} locale="ar" switchLocaleNavigateTo="/" />
      </div>
    </NextIntlClientProvider>
  );
}
