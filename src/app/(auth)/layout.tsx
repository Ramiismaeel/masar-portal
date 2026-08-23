import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LegalFooter } from "@/components/legal-footer";
import type { Locale } from "@/i18n/locale";
import { getTheme } from "@/lib/theme";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const theme = await getTheme();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* A mini header of its own, always at the top of the page — not part
          of the centered column below, so the logo underneath it can stay
          centered at every width instead of sharing a row with these. */}
      <div className="flex w-full items-center justify-end gap-2 border-b border-border px-4 py-3">
        <ThemeToggle theme={theme} />
        <LocaleSwitcher />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-base font-semibold text-foreground"
        >
          <Image src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
          Masar <span className="font-medium text-muted-foreground">Portal</span>
        </Link>
        <div
          className="w-full max-w-md animate-in fade-in slide-in-from-bottom-1
            duration-300 motion-reduce:animate-none"
        >
          {children}
        </div>
        <div className="flex w-full max-w-md justify-center">
          <LegalFooter locale={locale} />
        </div>
      </div>
    </div>
  );
}
