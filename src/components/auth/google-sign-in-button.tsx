"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5c-2 1.5-4.6 2.4-7.6 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.7 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.5 35.9 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  label,
  callbackURL,
  onError,
}: {
  label: string;
  callbackURL: string;
  /** Only fires for a failure BEFORE the redirect to Google (e.g. network
   *  error). A failure AFTER Google redirects back arrives as ?error=... on
   *  errorCallbackURL instead — this component is gone by then. Takes no
   *  message: `error.message` here is an internal Better Auth string, not
   *  copy meant for an applicant, so the caller supplies its own translated
   *  text (same generic string both call sites already use). */
  onError: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        const { error } = await authClient.signIn.social({
          provider: "google",
          callbackURL,
          errorCallbackURL: "/login",
        });
        if (error) {
          onError();
          setIsPending(false);
        }
        // No redirect ⇒ Better Auth's client already navigated to Google.
      }}
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}
