import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations, getLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { CategoryCard } from "@/components/category-card";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/i18n/locale";

export default async function HomePage() {
  // Read the session, but do NOT gate on it. This page is deliberately outside
  // the (app) route group: it is the public front door. The session only decides
  // where the cards point and what the CTA says.
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = Boolean(session?.user);

  const t = await getTranslations("Home");
  const locale = (await getLocale()) as Locale;

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
            <LocaleSwitcher />
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
          <nav className="flex flex-wrap gap-4">
            {/* TODO: real pages. An Impressum is a legal expectation for a company registered in Germany. */}
            <Link href="/impressum" className="hover:text-foreground">
              {t("impressum")}
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              {t("privacy")}
            </Link>
            <a
              href="https://masar-center.de"
              className="hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              masar-center.de
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
