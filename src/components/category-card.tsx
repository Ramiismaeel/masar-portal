import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CategoryMeta } from "@/lib/categories";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";

type CategoryCardProps = {
  category: CategoryMeta;
  /** Computed by the caller — the card must not know anything about sessions. */
  href: string;
  locale: Locale;
};

export async function CategoryCard({ category, href, locale }: CategoryCardProps) {
  const Icon = category.icon;
  // getTranslations({ locale, ... }), not the sync useTranslations() hook —
  // found live, not anticipated: useTranslations() has no locale-override
  // option at all (checked its type — only takes a namespace), so it always
  // reads the AMBIENT cookie-derived locale regardless of the `locale` prop
  // this component already receives and correctly uses for pick() below.
  // On /ar (src/app/ar/page.tsx, a fixed-locale page for a cookie-less
  // visitor) that mismatch meant the category label/blurb were correctly
  // Arabic via pick(), but the "Start" button stayed English — same
  // request-config bug already fixed once in src/i18n/request.ts, just
  // surfacing again through next-intl's OTHER server API for reading
  // translated strings.
  const t = await getTranslations({ locale, namespace: "CategoryCard" });

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-start transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <span className="text-lg font-semibold text-card-foreground">
        {pick(locale, category.labelEn, category.labelAr)}
      </span>

      <span className="text-sm leading-relaxed text-muted-foreground">
        {pick(locale, category.blurbEn, category.blurbAr)}
      </span>

      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
        {t("start")}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
