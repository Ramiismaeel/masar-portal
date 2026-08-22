import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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

export const metadata: Metadata = {
  title: "Masar Portal",
  description:
    "Document checklist and upload portal for Masar Center visa applicants.",
  // manifest.webmanifest is auto-linked from src/app/manifest.ts — no
  // manual `manifest:` field needed here. Next also auto-detects
  // src/app/icon.png and src/app/apple-icon.png for favicon/apple-touch-icon.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Masar",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d4d35",
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
