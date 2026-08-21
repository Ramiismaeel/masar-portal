import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

/**
 * A signed-in user has no reason to see the login form — send them to
 * /dashboard, not / (home). Home is the public front door; landing on
 * /login means they were already trying to get into the app.
 */
export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
