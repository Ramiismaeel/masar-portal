import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

/** Same reasoning as /login — see that file. */
export default async function SignupPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect("/dashboard");
  }

  return <SignupForm />;
}
