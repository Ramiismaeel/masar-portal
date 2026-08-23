import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { DeleteAccountControl } from "@/components/account/delete-account-control";

export default async function AccountPage() {
  // (app)/layout.tsx already gates this route — this second check exists
  // because the page reads session fields directly, and "the layout checked"
  // is not something a page should assume about its own data.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const t = await getTranslations("Account");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>

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

      <DeleteAccountControl />
    </div>
  );
}
