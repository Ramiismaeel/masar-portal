import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CookieSettingsLink } from "@/components/cookie-settings-link";
import type { Locale } from "@/i18n/locale";

/**
 * The three links German Impressumspflicht requires be reachable from every
 * page, not just the home page — dropped into (app)/layout.tsx and
 * (auth)/layout.tsx as well as home-content.tsx's own footer. Always takes
 * an explicit `locale` prop, same reasoning as every other component
 * home-content.tsx renders (see its own header comment) — this makes it
 * safe to use from /ar too, not just cookie-driven pages.
 */
export async function LegalFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Footer" });

  return (
    <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      <Link href="/impressum" className="hover:text-foreground">
        {t("impressum")}
      </Link>
      <Link href="/datenschutz" className="hover:text-foreground">
        {t("privacy")}
      </Link>
      <CookieSettingsLink label={t("cookieSettings")} />
    </nav>
  );
}
