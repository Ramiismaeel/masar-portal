import type { Locale } from "./locale";

/**
 * Selects between a pre-translated pair of DATA fields (labelEn/labelAr on
 * a category, a checklist requirement, a status meta) based on the active
 * locale. Not the same mechanism as next-intl's t() — those pairs live in
 * TypeScript config objects (categories.ts, checklists.ts,
 * application-status.ts), not the messages/*.json catalogs, because they're
 * domain data with a stable `code`/`value` identity, not UI copy.
 */
export function pick(locale: Locale, en: string, ar: string): string {
  return locale === "ar" ? ar : en;
}
