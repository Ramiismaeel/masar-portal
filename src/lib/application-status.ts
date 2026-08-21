import type { ApplicationStatus } from "@/generated/prisma/client";

/**
 * How each status is presented. Keyed by the enum so adding a status to
 * schema.prisma without adding it here is a TypeScript error, not a blank badge.
 *
 * Colours are semantic tokens only — no `bg-green-600`. Phase 7 flips the theme
 * and RTL; hard-coded palette values are what break first.
 */
export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { labelEn: string; labelAr: string; className: string }
> = {
  DRAFT: {
    labelEn: "Draft",
    labelAr: "مسودة",
    className: "bg-muted text-muted-foreground",
  },
  PENDING_REVIEW: {
    labelEn: "In review",
    labelAr: "قيد المراجعة",
    className: "bg-primary/10 text-primary",
  },
  NEEDS_REVISION: {
    labelEn: "Changes requested",
    labelAr: "مطلوب تعديل",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
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
};
