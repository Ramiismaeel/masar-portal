// TEMPORARY DIAGNOSTIC ROUTE — DELETE ONCE PRODUCTION IS FIXED.
//
// Vercel hides "sensitive" environment variable values, so we cannot read them
// from the dashboard. This route asks the *running* production function what it
// actually sees, and reports presence + length only — never a value.

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Prisma cannot run on the Edge runtime.
export const runtime = "nodejs";
// Without this, Next may evaluate the route at build time and report the BUILD
// environment instead of the RUNTIME environment — the exact thing we are
// trying to tell apart.
export const dynamic = "force-dynamic";

const CHECKED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

type DbResult = { ok: true } | { ok: false; message: string; code?: string };

export async function GET(req: NextRequest) {
  const expected = process.env.DEBUG_TOKEN;
  const provided = req.nextUrl.searchParams.get("token");

  // 404, not 401: a 401 would confirm the route exists.
  // The `!expected` half matters — without it, a deployment that is missing
  // DEBUG_TOKEN would compare undefined === undefined and open to the world.
  if (!expected || provided !== expected) {
    return new Response(null, { status: 404 });
  }

  const env = Object.fromEntries(
    CHECKED.map((name) => {
      const value = process.env[name];
      return [name, { present: Boolean(value), length: value?.length ?? 0 }];
    }),
  );

  let db: DbResult;
  try {
    await prisma.$queryRaw`select 1`;
    db = { ok: true };
  } catch (error) {
    db = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: string }).code,
    };
  }

  return Response.json({ env, db });
}
