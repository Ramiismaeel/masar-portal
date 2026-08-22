import { cookies } from "next/headers";

/**
 * Single source of truth for the light/dark preference — same "cookie +
 * Server Action + router.refresh()" shape as src/i18n/locale.ts, so the two
 * toggles behave identically to a user (and to future maintainers).
 *
 * Client components only ever `import type { Theme }` from this file — a
 * type-only import is erased at compile time, so pulling in next/headers'
 * `cookies()` here never leaks into a client bundle.
 */
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";

export const THEME_COOKIE = "theme";

export function isTheme(value: string | undefined | null): value is Theme {
  return THEMES.some((t) => t === value);
}

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(THEME_COOKIE)?.value;
  return isTheme(raw) ? raw : DEFAULT_THEME;
}
