/**
 * Single source of truth for supported locales — everything else (the
 * request config, the switcher, the cookie logic) derives from this instead
 * of repeating the list.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.some((l) => l === value);
}
