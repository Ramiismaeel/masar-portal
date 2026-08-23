import type { ScanStatus } from "@/generated/prisma/client";

/**
 * How a document's malware-scan outcome is shown to STAFF. Same enum-keyed
 * shape as DOCUMENT_REVIEW_STATUS_META, so adding a value to schema.prisma
 * without handling it here is a TypeScript error rather than a blank badge.
 *
 * Admin-only, hence English-only (see CLAUDE.md §7 — /admin is pinned to
 * English). Applicants never see this: whether our scanner coped with a file
 * is our operational problem, not something to worry them with.
 *
 * `warn` is the point of this module. An admin is about to download a file
 * onto a work machine and open it; the only status that must visibly
 * interrupt that is one where nothing checked the file first. CLEAN is
 * deliberately given no badge at all — a badge on every row would be noise,
 * and noise is what makes people stop reading warnings.
 */
export const SCAN_STATUS_META: Record<
  ScanStatus,
  { labelEn: string; className: string; warn: boolean }
> = {
  CLEAN: {
    labelEn: "Scanned",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    warn: false,
  },
  PENDING: {
    labelEn: "Scan pending",
    className: "bg-muted text-muted-foreground",
    warn: true,
  },
  SKIPPED: {
    labelEn: "Not scanned — too large",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    warn: true,
  },
  FAILED: {
    labelEn: "Scan failed",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    warn: true,
  },
  INFECTED: {
    // Should be unreachable — an infected file is rejected and never stored.
    // Present because the enum requires it, and because a row in this state
    // would mean something has gone badly wrong and must be impossible to miss.
    labelEn: "INFECTED",
    className: "bg-destructive/15 text-destructive font-semibold",
    warn: true,
  },
};
