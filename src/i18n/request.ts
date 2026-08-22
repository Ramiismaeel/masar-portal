import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./locale";

/**
 * No [locale] route segment — the whole app lives at one set of URLs
 * regardless of language (roadmap decision: switching language must not
 * lose form state, which a route change would risk). The locale is read
 * from a cookie instead, same one the switcher writes to
 * (src/components/locale-switcher.tsx) and the same one mirrored to
 * User.locale for a signed-in user.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
