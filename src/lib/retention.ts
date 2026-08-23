import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { prisma } from "./prisma";
import { r2, R2_BUCKET } from "./r2";
import { recordAudit } from "./audit";

/**
 * How long a decided application's UPLOADED FILES are kept before being
 * purged, counted from the moment it reached a terminal status.
 *
 * CONFIRMED by Masar, 23 Aug 2026 — this is a settled business/legal policy
 * decision, no longer a placeholder. 180 days is long enough to reopen a case
 * in the same application season, short enough to be a real limit.
 *
 * Changing it is a POLICY change, not a tuning knob: it must be agreed with
 * Masar and Datenschutz §7 must be updated in the same change, or the portal
 * will be deleting data on a schedule different from the one applicants were
 * told about.
 */
export const DOCUMENT_RETENTION_DAYS = 180;

/**
 * Statuses that start the retention clock. DRAFT / PENDING_REVIEW are live
 * work and are never purged, no matter how old — an application sitting in
 * the review queue for a year is a backlog problem, not a retention one.
 */
const TERMINAL_STATUSES = ["APPROVED", "REJECTED"] as const;

export type RetentionResult = {
  applicationsAffected: number;
  documentsDeleted: number;
  storageFailures: number;
};

/**
 * Deletes documents belonging to applications that reached a terminal status
 * more than DOCUMENT_RETENTION_DAYS ago (GDPR Art. 5(1)(e), storage
 * limitation).
 *
 * Deletes the FILES, not the applications. The application row is the record
 * that Masar handled this case and what was decided — small, non-sensitive,
 * and the thing staff need to answer "did we work with this person?". The
 * passports, criminal-record extracts and medical reports attached to it are
 * the sensitive part, and they are what a retention limit exists to remove.
 *
 * Order matters, and mirrors deleteDocument: the DB row goes first, then the
 * R2 object. The database is the source of truth for "is this uploaded", so
 * a failed storage delete leaves an orphaned object (logged, cleanable) but
 * never a checklist claiming a file exists that doesn't.
 */
export async function purgeExpiredDocuments(
  now: Date = new Date(),
): Promise<RetentionResult> {
  const cutoff = new Date(
    now.getTime() - DOCUMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const expired = await prisma.application.findMany({
    where: {
      status: { in: [...TERMINAL_STATUSES] },
      updatedAt: { lt: cutoff },
      documents: { some: {} },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      documents: { select: { id: true, storageKey: true } },
    },
  });

  let documentsDeleted = 0;
  let storageFailures = 0;

  for (const application of expired) {
    const ids = application.documents.map((d) => d.id);

    try {
      await prisma.document.deleteMany({ where: { id: { in: ids } } });
    } catch (error) {
      console.error(
        "purgeExpiredDocuments: db delete failed for application",
        application.id,
        error,
      );
      continue;
    }

    documentsDeleted += ids.length;

    const results = await Promise.allSettled(
      application.documents.map((d) =>
        r2.send(
          new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: d.storageKey }),
        ),
      ),
    );
    storageFailures += results.filter((r) => r.status === "rejected").length;

    await recordAudit({
      action: "RETENTION_PURGE",
      // No actor: this is an automated job, not a person.
      actorUserId: null,
      subjectUserId: application.userId,
      targetType: "application",
      targetId: application.id,
      metadata: {
        documentsDeleted: ids.length,
        status: application.status,
        retentionDays: DOCUMENT_RETENTION_DAYS,
      },
    });
  }

  if (storageFailures > 0) {
    console.error(
      `purgeExpiredDocuments: ${storageFailures} R2 object(s) failed to delete and are now orphaned — remove manually.`,
    );
  }

  return {
    applicationsAffected: expired.length,
    documentsDeleted,
    storageFailures,
  };
}
