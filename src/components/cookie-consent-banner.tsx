"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { setCookieConsent } from "@/lib/actions/cookie-consent";
import { Button } from "@/components/ui/button";
import type { CookieConsent } from "@/lib/cookie-consent";

/**
 * Visibility is driven entirely by `initialConsent`, read server-side from
 * the cookie by the root layout and passed down — same "server owns the
 * source of truth, client just reacts" shape as LocaleSwitcher. Clicking
 * either button sets the cookie then router.refresh()es, which re-reads the
 * cookie server-side and passes an updated prop — no local dismissed state
 * to keep in sync with the real cookie.
 */
export function CookieConsentBanner({
  initialConsent,
}: {
  initialConsent: CookieConsent | null;
}) {
  const t = useTranslations("CookieConsent");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (initialConsent !== null) return null;

  const choose = (consent: CookieConsent) => {
    startTransition(async () => {
      await setCookieConsent(consent);
      router.refresh();
    });
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-4 shadow-lg"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-card-foreground">{t("title")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t("body")}{" "}
            <Link href="/datenschutz#cookies" className="underline hover:text-foreground">
              {t("learnMore")}
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => choose("necessary")}
          >
            {t("necessaryOnly")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => choose("all")}
          >
            {t("acceptAll")}
          </Button>
        </div>
      </div>
    </div>
  );
}
