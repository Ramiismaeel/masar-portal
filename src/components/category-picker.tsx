import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { CATEGORIES, type CategoryValue } from "@/lib/categories";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";

/**
 * Offers only the categories the user has NOT started.
 *
 * This is the UI half of the "one application per category" rule. The database
 * constraint and the Server Action are the enforcing half — this just avoids
 * showing a button that would bounce the user straight back.
 */
export function CategoryPicker({
  taken,
  locale,
}: {
  taken: CategoryValue[];
  locale: Locale;
}) {
  const t = useTranslations("CategoryPicker");
  const takenSet = new Set<string>(taken);
  const available = CATEGORIES.filter((c) => !takenSet.has(c.value));

  if (available.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        {t("allTaken")}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {available.map((category) => {
        const Icon = category.icon;

        return (
          <li key={category.value}>
            <Link
              href={`/applications/new?category=${category.value}`}
              className="group flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-start transition-colors hover:border-primary"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-card-foreground">
                {pick(locale, category.labelEn, category.labelAr)}
              </span>
              <Plus
                className="ms-auto size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
