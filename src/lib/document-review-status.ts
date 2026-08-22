import type { ReviewStatus } from "@/generated/prisma/client";

/**
 * How a document's review outcome is shown to the applicant. Same pattern
 * as APPLICATION_STATUS_META (application-status.ts) — keyed by the enum so
 * adding a status to schema.prisma without adding it here is a TypeScript
 * error, not a blank badge.
 */
export const DOCUMENT_REVIEW_STATUS_META: Record<
  ReviewStatus,
  { labelEn: string; labelAr: string; className: string }
> = {
  PENDING: {
    labelEn: "Awaiting review",
    labelAr: "بانتظار المراجعة",
    className: "bg-muted text-muted-foreground",
  },
  APPROVED: {
    labelEn: "Approved",
    labelAr: "مقبول",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    labelEn: "Rejected",
    labelAr: "مرفوض",
    className: "bg-destructive/15 text-destructive",
  },
  NEEDS_REVISION: {
    labelEn: "Changes requested",
    labelAr: "مطلوب تعديل",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
};
