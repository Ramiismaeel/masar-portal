import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { DatenschutzEn } from "@/components/legal/datenschutz-en";
import { DatenschutzAr } from "@/components/legal/datenschutz-ar";
import type { Locale } from "@/i18n/locale";

const LAST_UPDATED = "2026-08-22";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "LegalPage" });
  return {
    title: t("privacyTitle"),
    alternates: { canonical: "/datenschutz" },
  };
}

export default async function DatenschutzPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "LegalPage" });

  return (
    <LegalPageShell locale={locale} title={t("privacyTitle")} lastUpdated={LAST_UPDATED}>
      {locale === "ar" ? <DatenschutzAr /> : <DatenschutzEn />}
    </LegalPageShell>
  );
}
