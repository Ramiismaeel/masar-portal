import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ResendEmailButton } from "@/components/auth/resend-email-button";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LegalFooter } from "@/components/legal-footer";
import { AppMobileMenu } from "@/components/app-mobile-menu";
import type { Locale } from "@/i18n/locale";
import { getTheme } from "@/lib/theme";

// Everything under (app) is a signed-in user's own applications and
// documents — no reason for it to be crawled or indexed, and every reason
// not to (personal data, IDOR-adjacent risk of a cached title/URL leaking
// that someone applied). Overrides the root layout's permissive default.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("AppLayout");
  const locale = (await getLocale()) as Locale;
  const theme = await getTheme();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
            <span className="text-lg font-semibold text-foreground">
              Masar <span className="font-medium text-muted-foreground">Portal</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language stays directly in the header on every breakpoint —
                a one-tap toggle used far more than what's below, so it
                shouldn't be a tap deeper than everything else. */}
            <LocaleSwitcher />

            {/* Desktop: the rest, inline — there's room. Mobile: these move
                into AppMobileMenu's slide-out panel instead, since logo +
                language + theme + admin + sign out in one unwrapped row was
                genuinely too much for a phone width. */}
            <div className="hidden items-center gap-4 sm:flex">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/admin" />}
                >
                  {t("admin")}
                </Button>
              )}
              <ThemeToggle theme={theme} />
              <SignOutButton />
            </div>

            <AppMobileMenu isAdmin={isAdmin} theme={theme} />
          </div>
        </div>
      </header>

      {!session.user.emailVerified && (
        <div className="border-b bg-muted">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm">
              {t.rich("verifyBanner", {
                email: session.user.email,
                b: (chunks) => <span className="font-medium">{chunks}</span>,
              })}
            </p>

            <ResendEmailButton email={session.user.email} />
          </div>
        </div>
      )}

      {/* A short fade+rise on each navigation, so a page swap reads as a
          transition rather than an abrupt repaint. `motion-reduce:` opts
          out entirely for anyone who's asked their OS for less motion —
          decorative only, unlike the button spinners, which stay. */}
      <main
        className="mx-auto w-full max-w-5xl flex-1 animate-in px-4 py-8 fade-in
          slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
      >
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <LegalFooter locale={locale} />
        </div>
      </footer>
    </div>
  );
}
