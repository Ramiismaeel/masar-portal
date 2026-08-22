import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
import { HomeContent } from "@/components/home-content";
import type { Locale } from "@/i18n/locale";

/**
 * hreflang lives HERE, not in the root layout — every other route inherits
 * the layout's metadata too, and only / genuinely has an Arabic counterpart
 * (/ar, see src/app/ar/page.tsx). Putting `alternates.languages` in the root
 * layout would put an "Arabic version of this page is at /ar" claim on
 * /dashboard and /login as well, which is simply false. This overrides the
 * layout's plain `alternates: { canonical: "/" }` with the fuller version,
 * just for this one route.
 */
export function generateMetadata(): Metadata {
  return {
    alternates: {
      canonical: "/",
      languages: { en: "/", ar: "/ar", "x-default": "/" },
    },
  };
}

export default async function HomePage() {
  // Read the session, but do NOT gate on it. This page is deliberately outside
  // the (app) route group: it is the public front door. The session only decides
  // where the cards point and what the CTA says.
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = Boolean(session?.user);
  const locale = (await getLocale()) as Locale;

  return <HomeContent isSignedIn={isSignedIn} locale={locale} />;
}
