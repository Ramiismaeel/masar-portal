import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ResendEmailButton } from "@/components/auth/resend-email-button";

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
              Verify your email to submit an application. We sent a link to{" "}
              <span className="font-medium">{session.user.email}</span>.
            </p>

            <ResendEmailButton email={session.user.email} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
