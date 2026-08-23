import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { prisma } from "./prisma";
import { r2, R2_BUCKET } from "./r2";

/**
 * Removes every uploaded file belonging to a user from R2.
 *
 * MUST run BEFORE the User row is deleted. The schema's `onDelete: Cascade`
 * wipes applications → documents the moment the user goes, and the
 * `storageKey`s needed to find these objects go with them — after that the
 * files are unreachable orphans, paid for forever and (worse, for a GDPR
 * erasure request) still holding passports and medical reports.
 *
 * Wired into Better Auth's `user.deleteUser.beforeDelete` hook, which is
 * called on both deletion paths (the direct POST and the emailed-token
 * callback) — verified in better-auth's own source, not assumed.
 *
 * Storage deletion is best-effort per object, matching the established
 * pattern in deleteDocument/deleteApplication: the database is the source of
 * truth for "does this exist", so a failed storage delete leaves an orphaned
 * object but never blocks the erasure the applicant asked for. Every failure
 * is logged loudly enough to be cleaned up by hand.
 *
 * Relative imports on purpose: this module is pulled in by src/lib/auth.ts,
 * which the Better Auth / Prisma CLIs load through `jiti` — and jiti does not
 * resolve the `@/` alias (see docs/roadmap.md "Prisma 7 gotchas").
 */
export async function purgeUserStorage(userId: string): Promise<void> {
  const documents = await prisma.document.findMany({
    where: { application: { userId } },
    select: { storageKey: true },
  });

  if (documents.length === 0) return;

  const results = await Promise.allSettled(
    documents.map((document) =>
      r2.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: document.storageKey }),
      ),
    ),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(
      `purgeUserStorage: ${failed} of ${documents.length} R2 objects failed to delete for user ${userId} — these are now orphaned and must be removed manually.`,
    );
  }
}
