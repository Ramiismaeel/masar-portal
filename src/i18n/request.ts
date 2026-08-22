import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale";

/**
 * No [locale] route segment — the whole app lives at one set of URLs
 * regardless of language (roadmap decision: switching language must not
 * lose form state, which a route change would risk). The locale is read
 * from a cookie instead, same one the switcher writes to
 * (src/components/locale-switcher.tsx) and the same one mirrored to
 * User.locale for a signed-in user.
 *
 * The `locale` param below MUST be checked first — found live, not
 * anticipated: an earlier version of this file ignored it and always
 * re-derived from the cookie, which silently broke every explicit-locale
 * call (`getTranslations({ locale: "ar", ... })`, used by src/app/ar/page.tsx
 * to render a fixed-language page regardless of the visitor's cookie) —
 * every "Arabic" string on /ar rendered in English instead, with no error,
 * because this callback was quietly overriding the override. next-intl
 * passes the explicit locale through exactly for this case (see
 * GetRequestConfigParams in its own types) — the cookie read is only the
 * fallback for the normal case for cookie-derived pages, not the source of
 * truth for every locale-resolving call in the app.
 */
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  let locale: Locale;

  if (isLocale(explicitLocale)) {
    locale = explicitLocale;
  } else {
    const cookieStore = await cookies();
    const raw = cookieStore.get(LOCALE_COOKIE)?.value;
    locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
