"use server";

import { cookies } from "next/headers";

import {
  COOKIE_CONSENT_COOKIE,
  type CookieConsent,
} from "@/lib/cookie-consent";

/** Same pattern as setLocale: no revalidatePath, caller does router.refresh(). */
export async function setCookieConsent(consent: CookieConsent) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_CONSENT_COOKIE, consent, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

/** Powers the footer's "Cookie settings" link — clears the choice so the banner reappears. */
export async function resetCookieConsent() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_CONSENT_COOKIE);
}
