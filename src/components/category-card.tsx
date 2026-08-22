import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CategoryMeta } from "@/lib/categories";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";

type CategoryCardProps = {
  category: CategoryMeta;
  /** Computed by the caller — the card must not know anything about sessions. */
  href: string;
  locale: Locale;
};

export function CategoryCard({ category, href, locale }: CategoryCardProps) {
  const Icon = category.icon;
  const t = useTranslations("CategoryCard");

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
