import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Returns the session only if the caller is signed in, has the ADMIN role,
 * AND has a verified second factor — never just one of the three. Used by
 * every admin page and every admin Server Action independently; a layout's
 * redirect protects pages, but a Server Action is its own public HTTP
 * endpoint and must re-check.
 *
 * **Why 2FA is checked here and not only in admin/layout.tsx:** the layout
 * never runs for a direct Server Action call or a route handler. Without this
 * line an admin who skipped enrolment could still approve applications,
 * download passports and export a full application ZIP by calling those
 * endpoints directly — the exact surface the layout cannot defend, which is
 * why this function exists at all.
 *
 * **Read what this check actually guarantees, which is less than it looks.**
 * `twoFactorEnabled` is a flag on the USER ROW, not a property of the current
 * session. It becomes true only after a code has been verified once
 * (`skipVerificationOnEnable` is left false in src/lib/auth.ts), so it does
 * mean "this person has proven possession of a second factor at some point" —
 * but NOT "this session passed a second factor".
 *
 * The gap is Google sign-in: better-auth's two-factor plugin hooks only
 * `/sign-in/email`, `/sign-in/username` and `/sign-in/phone-number`, so an
 * OAuth callback never issues a challenge. An admin who enrolled and then
 * signs in with Google reaches here with the flag true on a session that was
 * never challenged. Accepted deliberately (Rami's call, 7 Sep 2026) rather
 * than papered over: staff signing in with Google are protected by Google's
 * own account security, and this must be stated as such in the DPIA rather
 * than claimed as our own second factor. See docs/roadmap.md, Phase 13a.
 *
 * Callers all treat `null` as "not authorised" and say nothing more specific,
 * so an un-enrolled admin gets the same answer as a stranger. Enrolment lives
 * on /account, outside every admin gate — see admin/layout.tsx.
 *
 * There is no admin-invite flow yet — `role` is granted by hand in Postgres
 * (Prisma Studio or a direct update). See docs/roadmap.md.
 */
export async function requireAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") return null;
  if (!session.user.twoFactorEnabled) return null;
  return session;
}
