import { getLocale } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { LegalFooter } from "@/components/legal-footer";
import type { Locale } from "@/i18n/locale";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-4 flex w-full max-w-md justify-end">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md">{children}</div>
      <div className="mt-8 flex w-full max-w-md justify-center">
        <LegalFooter locale={locale} />
      </div>
    </div>
  );
}
