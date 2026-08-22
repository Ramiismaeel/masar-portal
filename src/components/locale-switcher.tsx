"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "@/lib/actions/locale";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locale";

/** Shows the language you'd switch TO, not the current one — a one-tap toggle. */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: Locale = locale === "en" ? "ar" : "en";

  const handleClick = () => {
    startTransition(async () => {
      await setLocale(next);
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
