"use server";

import { cookies } from "next/headers";

import { THEME_COOKIE, isTheme } from "@/lib/theme";

/**
 * Switches light/dark. Cookie-only, unlike locale — nothing server-side
 * (emails, Server Action copy) depends on the theme, so there's no reason to
 * also persist it on User the way locale is. The caller follows up with
 * router.refresh(), not revalidatePath — see setLocale for why that matters
 * (busting the root layout's cache can wipe in-progress form state).
 */
export async function setTheme(theme: string) {
  if (!isTheme(theme)) return;

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
