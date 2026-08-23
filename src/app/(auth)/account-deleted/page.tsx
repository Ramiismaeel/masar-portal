import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Where Better Auth's delete-user callback redirects once the account is
 * gone. Lives in the (auth) group, NOT (app): by the time this renders the
 * session has been destroyed and the cookie cleared, so an (app) page would
 * bounce straight to /login and swallow the confirmation entirely — the same
 * reasoning that put /verify-email here.
 */
export default async function AccountDeletedPage() {
  const t = await getTranslations("Account");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">{t("deletedTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("deletedBody")}</p>
        <Button className="w-full" nativeButton={false} render={<Link href="/" />}>
          {t("deletedHome")}
        </Button>
      </CardContent>
    </Card>
  );
}
