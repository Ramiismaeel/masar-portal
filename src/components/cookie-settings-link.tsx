"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { resetCookieConsent } from "@/lib/actions/cookie-consent";

/** Clears the stored choice and refreshes — CookieConsentBanner reappears since its prop goes back to null. */
export function CookieSettingsLink({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await resetCookieConsent();
        router.refresh();
      })}
      className="hover:text-foreground"
    >
      {label}
    </button>
  );
}
