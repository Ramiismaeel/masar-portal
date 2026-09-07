import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountControl } from "@/components/account/delete-account-control";
import { TwoFactorControl } from "@/components/account/two-factor-control";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mfa?: string }>;
}) {
  // Set by admin/layout.tsx when it bounces an admin here to enrol. Read in
  // the Server Component rather than with useSearchParams(), the same
  // convention /login and /verify-email already follow.
  const { mfa } = await searchParams;
  // (app)/layout.tsx already gates this route — this second check exists
  // because the page reads session fields directly, and "the layout checked"
  // is not something a page should assume about its own data.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // Whether to ask for a password before enrolling in 2FA is decided by
  // whether one exists, not by which provider they happen to be signed in
  // with right now — an account can have both (this project's sole admin
  // does). Scoped to the session's own user id; never an id from the client.
  const credential = await prisma.account.findFirst({
    where: { userId: session.user.id, password: { not: null } },
    select: { id: true },
  });

  // A row without `twoFactorEnabled` means setup was started and abandoned.
  // The control needs to know, so it can offer "finish setting up" instead of
  // "start setup" — pressing start again would replace the stored secret and
  // orphan whatever is already in the authenticator app.
  const pendingTwoFactor =
    !session.user.twoFactorEnabled &&
    (await prisma.twoFactor.count({ where: { userId: session.user.id } })) > 0;

  const t = await getTranslations("Account");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>

      {mfa === "required" && (
        <Alert>
          <AlertDescription>{t("TwoFactor.requiredForAdmin")}</AlertDescription>
        </Alert>
      )}

      <dl className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">
            {t("name")}
          </dt>
          <dd className="text-sm text-card-foreground">{session.user.name}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">
            {t("email")}
          </dt>
          <dd className="text-sm text-card-foreground" dir="ltr">
            {session.user.email}
          </dd>
        </div>
      </dl>

      <TwoFactorControl
        enabled={session.user.twoFactorEnabled ?? false}
        pendingSetup={pendingTwoFactor}
        hasPassword={Boolean(credential)}
      />

      <DeleteAccountControl />
    </div>
  );
}
