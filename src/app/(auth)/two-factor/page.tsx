import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

/**
 * Second-factor challenge, reached from /login when sign-in returns
 * `twoFactorRedirect` rather than a session.
 *
 * No session check gates this page — by design, there is no session yet at
 * this point, only better-auth's short-lived two-factor challenge cookie. The
 * check that *is* here is the opposite one: somebody who already holds a full
 * session has nothing to prove, so send them on rather than showing a form
 * that would fail. Same shape as /login's own "already signed in" redirect.
 */
export default async function TwoFactorPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect("/dashboard");
  }

  return <TwoFactorForm />;
}
