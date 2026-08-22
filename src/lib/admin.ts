import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Returns the session only if the caller is signed in AND has the ADMIN
 * role — never just one or the other. Used by every admin page and every
 * admin Server Action independently; a layout's redirect protects pages,
 * but a Server Action is its own public HTTP endpoint and must re-check.
 *
 * There is no admin-invite flow yet — `role` is granted by hand in Postgres
 * (Prisma Studio or a direct update). See docs/roadmap.md.
 */
export async function requireAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}
