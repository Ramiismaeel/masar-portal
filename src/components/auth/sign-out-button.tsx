"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("Auth.SignOut");
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setFailed(false);

    // The result is CHECKED, not discarded — this used to be
    // `await authClient.signOut(); router.push("/login")`, which navigated
    // whether or not the session was actually destroyed.
    //
    // That is worse than doing nothing. The person sees a login screen,
    // concludes they are signed out, and walks away from a machine whose
    // session cookie is still live. On the shared and internet-café devices
    // this project's own threat model names, that hands the next user a
    // passport, a medical report and a criminal-record extract.
    //
    // Found the hard way: a broken dev server was returning 500 for every
    // /api/auth/* call, and the UI reported success throughout.
    const { error } = await authClient.signOut();

    if (error) {
      console.error("[sign-out] failed", error);
      setFailed(true);
      setIsSigningOut(false);
      return; // stay put — being wrong about this is the dangerous direction
    }

    router.push("/login");
    router.refresh();
  };

  return (
    // `relative` + an absolutely positioned message: this button lives in two
    // fixed-height headers as well as the mobile menu, so an inline error node
    // would reflow the header. `end-0` (not `right-0`) keeps it on the correct
    // side in Arabic.
    <div className={cn("relative inline-flex", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        loading={isSigningOut}
        className="w-full"
      >
        {isSigningOut ? t("signingOut") : t("button")}
      </Button>

      {failed && (
        <p
          role="alert"
          className="absolute end-0 top-full z-50 mt-1 max-w-64 rounded-md border border-destructive/40 bg-background px-2 py-1 text-start text-xs text-destructive shadow-md"
        >
          {t("error")}
        </p>
      )}
    </div>
  );
}
