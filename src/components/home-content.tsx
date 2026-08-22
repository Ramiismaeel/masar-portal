import Link from "next/link";
import Image from "next/image";
import { CheckCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CATEGORIES } from "@/lib/categories";
import { CategoryCard } from "@/components/category-card";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LegalFooter } from "@/components/legal-footer";
import type { Locale } from "@/i18n/locale";
import type { Theme } from "@/lib/theme";

/**
 * Shared between / (cookie-driven locale) and /ar (hardcoded locale, exists
 * purely so a shared link and search results have something crawlable and
 * correct in Arabic — see docs/roadmap.md "SEO"). `locale` is always an
 * explicit prop here, never read from the cookie internally — that's what
 * lets /ar render correctly for a crawler that carries no cookie at all.
 * `getTranslations({ locale, ... })`'s explicit-locale form does the same
 * for translated strings; the cookie-based zero-arg form never appears here.
 */
export async function HomeContent({
  isSignedIn,
  locale,
  theme,
  switchLocaleNavigateTo,
}: {
  isSignedIn: boolean;
  locale: Locale;
  theme: Theme;
  /**
   * /ar's content never changes with the cookie (that's the point), so the
   * normal in-place cookie-toggle-and-refresh LocaleSwitcher would silently
   * do nothing there. Passing a target here makes it navigate instead —
   * only /ar needs this; / already works via the plain cookie toggle.
   */
  switchLocaleNavigateTo?: string;
}) {
  const t = await getTranslations({ locale, namespace: "Home" });

  const hrefFor = (value: string) =>
    isSignedIn
      ? `/applications/new?category=${value}`
      : `/signup?category=${value}`;

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];

  // Shared between the mobile and desktop header layouts below — same
  // buttons, just arranged differently at each breakpoint.
  const navContent = (
    <>
      <ThemeToggle theme={theme} />
      <LocaleSwitcher navigateTo={switchLocaleNavigateTo} />
      {isSignedIn ? (
        <Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
          {t("goToDashboard")}
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            {t("logIn")}
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
            {t("createAccount")}
          </Button>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border">
        {/*
          Two different shapes per breakpoint, not one flexible layout:
          - Mobile: the logo can't share a row with the nav (up to 4 items
            signed out) without one of them getting cramped, so they're
            stacked — a compact utility row on top, the logo centered below
            it on its own row.
          - Desktop (sm+): back to the original single flex row, logo at the
            start, nav at the end — there's room, so a centered logo isn't
            needed and previously read as odd relative to the rest of the
            site's layout.
        */}
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:hidden">
          <nav className="flex items-center justify-center gap-2">{navContent}</nav>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground"
          >
            <Image src="/icon-192.png" alt="" width={30} height={30} className="rounded-md" />
            Masar <span className="font-medium text-muted-foreground">Portal</span>
          </Link>
        </div>

        <div className="mx-auto hidden w-full max-w-5xl items-center justify-between px-4 py-4 sm:flex">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Image src="/icon-192.png" alt="" width={30} height={30} className="rounded-md" />
            Masar <span className="font-medium text-muted-foreground">Portal</span>
          </Link>
          <nav className="flex items-center gap-2">{navContent}</nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-14 sm:py-20 lg:flex-row">
          <div className="w-full text-start lg:flex-1">
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("heroBody")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isSignedIn ? (
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/dashboard" />}
                >
                  {t("goToDashboard")}
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    nativeButton={false}
                    render={<Link href="/signup" />}
                  >
                    {t("createAccount")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/login" />}
                  >
                    {t("logIn")}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Decorative checklist illustration — purely visual, hidden below lg
              and from assistive tech; there's no real photography for this
              product yet (see docs/roadmap.md "Visual identity"). */}
          <div
            aria-hidden="true"
            className="relative hidden h-72 w-full flex-1 lg:block"
          >
            <div className="absolute inset-0 rounded-[28px] bg-primary/10" />
            <div className="absolute start-6 top-6 w-[78%] rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-card-foreground">
                  {t("chooseCategory")}
                </span>
                <span className="text-xs font-semibold text-brand-accent">6 / 9</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="size-4 shrink-0 rounded-[5px] bg-primary" />
                  <span className="h-2.5 flex-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="size-4 shrink-0 rounded-[5px] bg-primary" />
                  <span className="h-2.5 flex-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="size-4 shrink-0 rounded-[5px] border-[1.5px] border-brand-accent" />
                  <span className="h-2.5 w-2/3 rounded-full bg-border" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="size-4 shrink-0 rounded-[5px] border-[1.5px] border-border" />
                  <span className="h-2.5 w-1/2 rounded-full bg-border" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-5 end-3 w-[58%] rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-brand-accent/15 text-brand-accent">
                  <CheckCheck className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-card-foreground">
                    {t("step3Title")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("howItWorks")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category cards */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:pb-20">
          <h2 className="text-xl font-semibold text-foreground">
            {t("chooseCategory")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("chooseCategoryBody")}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <CategoryCard
                key={category.value}
                category={category}
                href={hrefFor(category.value)}
                locale={locale}
              />
            ))}
          </div>
        </section>

        {/* 3-step explainer */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <h2 className="text-xl font-semibold text-foreground">
              {t("howItWorks")}
            </h2>

            <ol className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-2 text-start">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-accent text-sm font-semibold text-brand-accent-foreground">
                    {index + 1}
                  </span>
                  <h3 className="font-medium text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footerRights", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-4">
            <LegalFooter locale={locale} />
            <a
              href="https://masar-center.de"
              className="hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              masar-center.de
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
