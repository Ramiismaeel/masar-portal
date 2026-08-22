import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ResendEmailButton } from "@/components/auth/resend-email-button";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LegalFooter } from "@/components/legal-footer";
import type { Locale } from "@/i18n/locale";

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/">
            <span className="text-lg font-semibold text-foreground">
              Masar Portal
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            {session.user.role === "ADMIN" && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/admin" />}
              >
                {t("admin")}
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <SignOutButton />
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <LegalFooter locale={locale} />
        </div>
      </footer>
    </div>
  );
}
