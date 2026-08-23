"use client";

import type { ComponentType } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "@/lib/actions/locale";
import { Button } from "@/components/ui/button";
import { GbFlag, SyFlag } from "@/components/flag-icon";
import type { Locale } from "@/i18n/locale";

// Same flag pairing masar-center.de uses for these two languages (checked
// live: its own mobile menu shows a UK flag for English and this Syria
// tricolour for Arabic) — fitting here too, since the roadmap's own "who
// this app is for" is explicitly applicants mostly located in Syria. Real
// SVGs, not emoji — see flag-icon.tsx for why.
const FLAGS: Record<Locale, ComponentType<{ className?: string }>> = {
  en: GbFlag,
  ar: SyFlag,
};

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
  const Flag = FLAGS[next];

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
      <Flag className="size-4 shrink-0 rounded-[2px]" />
      {t(next)}
    </Button>
  );
}
