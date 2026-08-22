import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";

import { RegisterServiceWorker } from "@/components/register-service-worker";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * generateMetadata, not a static `metadata` export — title/description/
 * og:locale all need to follow the same cookie-derived locale that decides
 * `dir`/`lang` below, and a static export can't read that. Copy for both
 * languages lives in messages/*.json's "Seo" namespace, not hardcoded here —
 * same mechanism as everywhere else in the app, not a separate one-off.
 *
 * Adapted from masar-center.de / masar-center.de/ar's own <head> (the
 * parent site), not copied wholesale — this is a different product:
 * - No hreflang alternates. masar-center.de has real per-language URLs
 *   (/  , /de, /ar) to link between; this app deliberately has ONE URL for
 *   both languages (see docs/roadmap.md "i18n" — routed locales would break
 *   the "switching language must not lose form state" rule). hreflang
 *   pointing multiple language versions at the identical URL would be
 *   meaningless at best, misleading to crawlers at worst, so it's left out
 *   entirely rather than faked.
 * - `metadataBase` is `BETTER_AUTH_URL`, already this environment's own
 *   canonical origin (prod/preview/local each have their own) — reusing it
 *   here instead of hardcoding a domain means this is automatically correct
 *   in whichever environment it runs.
 * - og:image is downloaded and self-hosted (public/og-image.webp), not a
 *   live cross-domain reference to masar-center.de — same reasoning as the
 *   PWA icons: a link preview shouldn't depend on a sibling site staying up,
 *   keeping the same filename, and never changing its dimensions out from
 *   under the width/height declared here. Caught exactly that already: the
 *   source site's own og:image:width says 1042, but the actual downloaded
 *   file is 1200×630 — their tag is stale. Real dimensions used below.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Seo");
  const locale = (await getLocale()) as Locale;
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(process.env.BETTER_AUTH_URL!),
    title: { default: title, template: t("titleTemplate") },
    description,
    keywords: t("keywords"),
    applicationName: "Masar Portal",
    alternates: { canonical: "/" },
    // manifest.webmanifest is auto-linked from src/app/manifest.ts — no
    // manual `manifest:` field needed here. Next also auto-detects
    // src/app/icon.png and src/app/apple-icon.png for favicon/apple-touch-icon.
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Masar",
    },
    // The default here is permissive — (app)/layout.tsx and admin/layout.tsx
    // override to noindex for the authenticated sections. Auth pages
    // (login/signup) inherit this and stay indexable on purpose: someone
    // searching "masar portal login" should find it.
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "Masar Portal",
      locale: locale === "ar" ? "ar_SY" : "en_US",
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

export const viewport: Viewport = {
  // Light/dark values match masar-center.de's own theme-color pair exactly
  // (read from its live <head>), not invented — same brand, same choice.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a6b4a" },
    { media: "(prefers-color-scheme: dark)", color: "#0d4d35" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // No [locale] route segment — the locale comes from a cookie
  // (src/i18n/request.ts), so it has to be read fresh on every render
  // rather than baked into the URL. dir flows from it directly: everything
  // else in the app assumes logical CSS properties (ps-, me-, text-start),
  // this is the one place a physical LTR/RTL decision actually gets made.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
