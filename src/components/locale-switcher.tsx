"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "@/lib/actions/locale";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locale";

/** Shows the language you'd switch TO, not the current one — a one-tap toggle. */
export function LocaleSwitcher({
  navigateTo,
}: {
  /**
   * /ar's content is a fixed locale by design (see docs/roadmap.md "SEO") —
   * it never responds to the cookie, so the normal refresh-in-place switch
   * would flip the cookie and visibly do nothing. Passing a target here
   * navigates there instead; / (the only other caller) omits it and keeps
   * the plain in-place behavior that's already confirmed not to lose form
   * state elsewhere in the app.
   */
  navigateTo?: string;
} = {}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: Locale = locale === "en" ? "ar" : "en";

  const handleClick = () => {
    startTransition(async () => {
      await setLocale(next);
      if (navigateTo) {
        router.push(navigateTo);
        return;
      }
      // router.refresh(), not the action calling revalidatePath — confirmed
      // live that revalidating the root layout wipes in-progress form
      // input, which is exactly what this switch must not do.
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      aria-label={t("label")}
    >
      {t(next)}
    </Button>
  );
}
