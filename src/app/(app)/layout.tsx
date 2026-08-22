import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ResendEmailButton } from "@/components/auth/resend-email-button";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";

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

  return (
    <div className="min-h-screen bg-background">
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

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
