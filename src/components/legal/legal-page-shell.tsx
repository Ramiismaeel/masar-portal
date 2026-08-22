import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/i18n/locale";

/**
 * Shared chrome for /impressum and /datenschutz. Unlike /ar, these are
 * normal cookie-driven pages (no fixed locale, no crawler concern) — dir
 * and lang already come from the root layout's <html>, so nothing special
 * is needed here beyond the explicit-locale prop threading the rest of this
 * app's bilingual components already use.
 */
export async function LegalPageShell({
  locale,
  title,
  lastUpdated,
  children,
}: {
  locale: Locale;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "LegalPage" });

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-medium text-foreground hover:underline">
            {t("backToHome")}
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-start">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("lastUpdated", { date: lastUpdated })}
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:text-muted-foreground [&_li]:mt-1 [&_a]:underline [&_a]:hover:text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
