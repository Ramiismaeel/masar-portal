import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Public landing page for Better Auth's email-verification link.
 *
 * Lives in the (auth) route group deliberately: two of the four outcomes below
 * arrive with no session (an expired/invalid token, or a scanner-prefetched
 * link), and the (app) layout would redirect those straight to /login before
 * this page ever got a chance to explain what happened.
 *
 * No email input anywhere on this page — see the enumeration note in
 * docs/roadmap.md. Resending goes through /login → the dashboard's
 * ResendEmailButton, which reads the address off the session rather than a
 * form field.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = await getTranslations("Auth.VerifyEmail");

  if (error === "TOKEN_EXPIRED") {
    return (
      <VerifyEmailCard title={t("expiredTitle")}>
        <p className="text-sm text-muted-foreground">{t("expiredBody")}</p>
        <LoginLink label={t("goToLogin")} />
      </VerifyEmailCard>
    );
  }

  if (error === "INVALID_TOKEN") {
    return (
      <VerifyEmailCard title={t("invalidTitle")}>
        <p className="text-sm text-muted-foreground">{t("invalidBody")}</p>
        <LoginLink label={t("goToLogin")} />
      </VerifyEmailCard>
    );
  }

  // No error param: either the click just verified this account (and Better
  // Auth's autoSignInAfterVerification issued a session), or the transition
  // already happened — e.g. an Outlook Safe Links prefetch consumed the link
  // before the human clicked it. Only a live session tells them apart.
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <VerifyEmailCard title={t("verifiedTitle")}>
      <p className="text-sm text-muted-foreground">{t("verifiedBody")}</p>
      <LoginLink label={t("goToLogin")} />
    </VerifyEmailCard>
  );
}

function VerifyEmailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">{children}</CardContent>
    </Card>
  );
}

function LoginLink({ label }: { label: string }) {
  return (
    <Button className="w-full" nativeButton={false} render={<Link href="/login" />}>
      {label}
    </Button>
  );
}
