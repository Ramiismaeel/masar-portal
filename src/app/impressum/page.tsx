import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { ImpressumEn } from "@/components/legal/impressum-en";
import { ImpressumAr } from "@/components/legal/impressum-ar";
import type { Locale } from "@/i18n/locale";

const LAST_UPDATED = "2026-08-22";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "LegalPage" });
  return {
    title: t("impressumTitle"),
    alternates: { canonical: "/impressum" },
  };
}

export default async function ImpressumPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "LegalPage" });

  return (
    <LegalPageShell locale={locale} title={t("impressumTitle")} lastUpdated={LAST_UPDATED}>
      {locale === "ar" ? <ImpressumAr /> : <ImpressumEn />}
    </LegalPageShell>
  );
}
