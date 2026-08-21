import Link from "next/link";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { CategoryCard } from "@/components/category-card";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Choose your category",
    body: "Study, Chancenkarte, Medical (D16) or Ausbildung — pick the one that matches your plan.",
  },
  {
    title: "Answer a few questions",
    body: "A short form, two steps. It takes about two minutes on a phone.",
  },
  {
    title: "Upload your documents",
    body: "You get a personalised checklist. Masar reviews each file and tells you what is missing.",
  },
] as const;

export default async function HomePage() {
  // Read the session, but do NOT gate on it. This page is deliberately outside
  // the (app) route group: it is the public front door. The session only decides
  // where the cards point and what the CTA says.
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = Boolean(session?.user);

  const hrefFor = (value: string) =>
    isSignedIn
      ? `/applications/new?category=${value}`
      : `/signup?category=${value}`;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Masar Portal
          </Link>

          <nav className="flex items-center gap-2">
            {isSignedIn ? (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Go to dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/signup" />}
                >
                  Create account
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
            Your German visa documents, in one place.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Masar Center guides you through the paperwork: a checklist built for
            your case, a place to upload every document, and a review from our
            team before anything reaches the embassy.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {isSignedIn ? (
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Go to dashboard
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/signup" />}
                >
                  Create account
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Log in
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Category cards */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:pb-20">
          <h2 className="text-xl font-semibold text-foreground">
            Choose your category
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each one has its own document checklist.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <CategoryCard
                key={category.value}
                category={category}
                href={hrefFor(category.value)}
              />
            ))}
          </div>
        </section>

        {/* 3-step explainer */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
            <h2 className="text-xl font-semibold text-foreground">
              How it works
            </h2>

            <ol className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
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
          <p>© {new Date().getFullYear()} Masar Center</p>
          <nav className="flex flex-wrap gap-4">
            {/* TODO: real pages. An Impressum is a legal expectation for a company registered in Germany. */}
            <Link href="/impressum" className="hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              Privacy
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
