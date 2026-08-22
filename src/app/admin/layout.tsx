import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";

import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import enMessages from "../../../messages/en.json";

// Staff-only, every page behind it lists real applicants' names, emails,
// and document review status — never indexed, same reasoning as
// (app)/layout.tsx one door over.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The admin security boundary — same principle as (app)/layout.tsx (a
 * layout, never middleware: Edge has no Prisma, and middleware header-based
 * checks have their own bypass history), one role check stricter.
 *
 * A signed-out visitor goes to /login. A signed-in non-admin goes to
 * /dashboard, not /login — they don't need telling to log in, they're
 * already in; they just don't have this role. Every admin Server Action
 * re-checks the role independently (requireAdminSession) — this layout
 * protects pages, not the actions themselves.
 *
 * i18n: admin is a staff-only internal tool and stays English regardless of
 * the visitor's own locale preference — see docs/roadmap.md. Two things had
 * to be forced independently, confirmed live: `dir="ltr"` on this
 * subtree (the root layout sets dir from the locale cookie, which would
 * otherwise mirror English text into an RTL layout when a visitor's
 * preference is Arabic), and a nested NextIntlClientProvider pinned to
 * "en" — shared components like SignOutButton call useTranslations() and
 * would otherwise inherit the root provider's Arabic messages here too.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <div dir="ltr" className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/admin">
              <span className="text-lg font-semibold text-foreground">
                Masar Admin
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                My dashboard
              </Button>
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
