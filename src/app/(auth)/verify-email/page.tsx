import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

  if (error === "TOKEN_EXPIRED") {
    return (
      <VerifyEmailCard title="This link has expired">
        <p className="text-sm text-muted-foreground">
          Verification links are valid for 7 days. Log in with your email and
          password, then use the &quot;Resend email&quot; button to get a new
          one.
        </p>
        <LoginLink />
      </VerifyEmailCard>
    );
  }

  if (error === "INVALID_TOKEN") {
    return (
      <VerifyEmailCard title="This link is invalid">
        <p className="text-sm text-muted-foreground">
          This verification link is malformed or has already been used. Log
          in and use the &quot;Resend email&quot; button if you still need to
          verify.
        </p>
        <LoginLink />
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
    <VerifyEmailCard title="Email verified">
      <p className="text-sm text-muted-foreground">
        Your email address has been verified. Please sign in to continue.
      </p>
      <LoginLink />
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

function LoginLink() {
  return (
    <Button className="w-full" nativeButton={false} render={<Link href="/login" />}>
      Go to login
    </Button>
  );
}
