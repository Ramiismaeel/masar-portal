import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CATEGORIES } from "@/lib/categories";
import { CategoryCard } from "@/components/category-card";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LegalFooter } from "@/components/legal-footer";
import type { Locale } from "@/i18n/locale";

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
  switchLocaleNavigateTo,
}: {
  isSignedIn: boolean;
  locale: Locale;
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

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Masar Portal
          </Link>

          <nav className="flex items-center gap-2">
            <LocaleSwitcher navigateTo={switchLocaleNavigateTo} />
            {isSignedIn ? (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
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
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/signup" />}
                >
                  {t("createAccount")}
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-4 py-14 text-start sm:py-20">
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
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
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
