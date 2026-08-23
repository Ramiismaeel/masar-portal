import { timingSafeEqual } from "crypto";

import { purgeExpiredDocuments } from "@/lib/retention";

/**
 * Scheduled retention purge. Called by Vercel Cron (see vercel.json).
 *
 * There is no session here — a cron invocation has no user — so the only
 * thing standing between the public internet and a bulk document delete is
 * CRON_SECRET. That makes this the most security-sensitive endpoint in the
 * app after the auth routes, hence:
 *   - refuses to run at all if CRON_SECRET is unset, rather than defaulting
 *     to open (a missing env var must fail closed, never silently disable
 *     the check);
 *   - constant-time comparison, so the secret can't be recovered a byte at
 *     a time by timing repeated requests;
 *   - 404 rather than 401/403, so a scanner learns nothing about whether
 *     this route exists.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
 */
function isAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run retention purge.");
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so guard first — the length
  // itself is not the secret.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const result = await purgeExpiredDocuments();
    console.log("retention purge complete", result);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("retention purge failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
