/**
 * The portal sets no analytics/advertising cookies today (verified —
 * grepped the codebase, nothing beyond Better Auth's session cookie and
 * the locale-preference cookie, both "strictly necessary"/functional and
 * exempt from consent under GDPR/ePrivacy on their own). This banner exists
 * ahead of that need, at Rami's request, so a future analytics addition has
 * somewhere to plug into rather than needing a consent system retrofitted
 * onto it. `"necessary"` and `"all"` behave identically right now — there is
 * no optional cookie to withhold yet — the distinction only starts doing
 * real work the day something reads `hasAnalyticsConsent()` before loading
 * an actual analytics script.
 */
export const COOKIE_CONSENT_COOKIE = "cookie-consent";

export type CookieConsent = "all" | "necessary";

export function isCookieConsent(
  value: string | undefined | null,
): value is CookieConsent {
  return value === "all" || value === "necessary";
}

/** Not called anywhere yet — the hook for whenever analytics is actually added. */
export function hasAnalyticsConsent(consent: CookieConsent | null): boolean {
  return consent === "all";
}
