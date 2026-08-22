"use server";

import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LOCALE_COOKIE, isLocale } from "@/i18n/locale";

/**
 * Switches the active language. No navigation, no [locale] segment — this
 * only changes the cookie src/i18n/request.ts reads. The caller
 * (LocaleSwitcher) follows up with router.refresh(), NOT this action calling
 * revalidatePath("/", "layout") — that was tried first and confirmed live to
 * wipe in-progress form input (an uncontrolled <input>'s DOM node gets
 * recreated, not just re-rendered, when the ROOT layout's cache is busted
 * that way). router.refresh() is next-intl's own documented pattern for
 * cookie-based, no-prefix locale switching, and preserves client state by
 * design. That preservation is the actual roadmap requirement — don't swap
 * this back to revalidatePath without re-testing it survives a live typed
 * form value.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Best-effort: a signed-in user's preference persists across devices too.
  // Never let this block the switch itself — the cookie already did its job.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    await prisma.user
      .update({ where: { id: session.user.id }, data: { locale } })
      .catch((error) => {
        console.error("setLocale: failed to persist User.locale", error);
      });
  }
}
