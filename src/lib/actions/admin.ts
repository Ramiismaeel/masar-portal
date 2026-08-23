"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import { applicationDecisionEmail } from "@/lib/emails/application-decision";
import { applicationReopenedEmail } from "@/lib/emails/application-reopened";
import { findRequirement } from "@/lib/checklists";
import { isCategoryValue } from "@/lib/categories";
import { recordAudit } from "@/lib/audit";

const REVIEW_STATUSES = ["APPROVED", "REJECTED", "NEEDS_REVISION"] as const;
type ReviewDecision = (typeof REVIEW_STATUSES)[number];

function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    typeof value === "string" &&
    (REVIEW_STATUSES as readonly string[]).includes(value)
  );
}

export type ReviewDocumentState = { error: string | null };

/**
 * Sets one document's reviewStatus + adminNote. Deliberately per-document,
 * not per-application — the applicant's checklist page renders this note
 * next to the specific file it's about, which is the whole point of
 * reviewing at this granularity instead of one application-wide comment box.
 */
export async function reviewDocument(
  _prev: ReviewDocumentState,
  formData: FormData,
): Promise<ReviewDocumentState> {
  const session = await requireAdminSession();
  if (!session) {
    return { error: "Not authorised." };
  }

  const applicationId = formData.get("applicationId");
  const requirementCode = formData.get("requirementCode");
  const rawStatus = formData.get("reviewStatus");
  const note = String(formData.get("adminNote") ?? "").trim();

  if (typeof applicationId !== "string" || typeof requirementCode !== "string") {
    return { error: "Invalid request." };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { status: true, category: true, userId: true },
  });

  if (!application) {
    return { error: "Application not found." };
  }

  // Only while the application is actually in the review queue — reviewing
  // a document on a DRAFT nobody submitted, or on one already decided,
  // doesn't mean anything.
  if (application.status !== "PENDING_REVIEW") {
    return { error: "This application is not currently in review." };
  }

  if (
    !isCategoryValue(application.category) ||
    !findRequirement(application.category, requirementCode)
  ) {
    return { error: "Unknown document type." };
  }

  if (!isReviewDecision(rawStatus)) {
    return { error: "Choose a review decision." };
  }

  // Approving needs no explanation; rejecting or asking for changes does —
  // the note is the only thing telling the applicant what to fix.
  if (rawStatus !== "APPROVED" && !note) {
    return { error: "Add a note explaining what needs to change." };
  }

  try {
    await prisma.document.update({
      where: {
        applicationId_requirementCode: { applicationId, requirementCode },
      },
      data: { reviewStatus: rawStatus, adminNote: note || null },
    });
  } catch (error) {
    console.error("reviewDocument failed", error);
    return { error: "Could not save the review. Please try again." };
  }

  // After the write, not before: this records what happened, and nothing
  // happened until the update above succeeded.
  await recordAudit({
    action: "DOCUMENT_REVIEWED",
    actorUserId: session.user.id,
    subjectUserId: application.userId,
    targetType: "document",
    targetId: `${applicationId}:${requirementCode}`,
    metadata: { requirementCode, reviewStatus: rawStatus, hasNote: Boolean(note) },
  });

  revalidatePath(`/admin/applications/${applicationId}`);

  return { error: null };
}

const DECISIONS = ["APPROVED", "REJECTED", "NEEDS_REVISION"] as const;
type Decision = (typeof DECISIONS)[number];

function isDecision(value: unknown): value is Decision {
  return typeof value === "string" && (DECISIONS as readonly string[]).includes(value);
}

export type DecideApplicationState = { error: string | null };

/**
 * The application-level outcome, separate from per-document review. Only
 * callable from PENDING_REVIEW — an admin who wants to change their mind
 * needs the applicant to resubmit first, which lands back in the queue for
 * a fresh decision rather than silently overwriting a past one.
 */
export async function decideApplication(
  _prev: DecideApplicationState,
  formData: FormData,
): Promise<DecideApplicationState> {
  const session = await requireAdminSession();
  if (!session) {
    return { error: "Not authorised." };
  }

  const applicationId = formData.get("applicationId");
  const rawDecision = formData.get("decision");

  if (typeof applicationId !== "string") {
    return { error: "Invalid request." };
  }

  if (!isDecision(rawDecision)) {
    return { error: "Choose a decision." };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!application) {
    return { error: "Application not found." };
  }

  if (application.status !== "PENDING_REVIEW") {
    return { error: "Only applications currently in review can be decided." };
  }

  try {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: rawDecision },
    });
  } catch (error) {
    console.error("decideApplication failed", error);
    return { error: "Could not save the decision. Please try again." };
  }

  await recordAudit({
    action: "APPLICATION_DECIDED",
    actorUserId: session.user.id,
    subjectUserId: application.userId,
    targetType: "application",
    targetId: application.id,
    metadata: { decision: rawDecision },
  });

  // A failed email must not undo or block the decision that already saved —
  // same reasoning as onExistingUserSignUp's mailer in auth.ts.
  const { subject, html } = applicationDecisionEmail({
    name: application.user.name,
    decision: rawDecision,
  });

  await sendEmail({ to: application.user.email, subject, html }).catch(
    (error) => {
      console.error("decideApplication: notification email failed", error);
    },
  );

  revalidatePath(`/admin/applications/${application.id}`);
  revalidatePath("/admin");
  revalidatePath(`/applications/${application.id}`);
  revalidatePath("/dashboard");

  return { error: null };
}

const DECIDED_STATUSES = ["APPROVED", "REJECTED", "NEEDS_REVISION"] as const;

export type ReopenApplicationState = { error: string | null };

/**
 * Sends an already-decided application back to PENDING_REVIEW.
 *
 * Fills a real gap: `decideApplication` only runs from PENDING_REVIEW, so
 * before this existed a decision could never be changed. REJECTED and
 * NEEDS_REVISION were at least recoverable — the applicant could resubmit —
 * but APPROVED was a permanent dead end, because `canUploadInStatus` also
 * excludes it, so *nothing in the app* could move an approved application.
 * A mis-clicked Approve needed database surgery to undo.
 *
 * Deliberately does NOT reset per-document reviewStatus/adminNote. Those are
 * still the admin's genuine feedback on specific files; wiping them would
 * destroy real work to undo an unrelated click. `submittedAt` is likewise
 * left alone — the application really was submitted then, and that timestamp
 * is what the review queue orders by.
 *
 * Note the applicant still cannot upload after a reopen: PENDING_REVIEW is
 * excluded from `canUploadInStatus`, which is correct — the application is
 * back in the queue, not back in the applicant's hands. To hand it back, the
 * admin decides NEEDS_REVISION from here.
 */
export async function reopenApplication(
  _prev: ReopenApplicationState,
  formData: FormData,
): Promise<ReopenApplicationState> {
  const session = await requireAdminSession();
  if (!session) {
    return { error: "Not authorised." };
  }

  const applicationId = formData.get("applicationId");
  if (typeof applicationId !== "string") {
    return { error: "Invalid request." };
  }

  const reason = String(formData.get("reason") ?? "").trim();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!application) {
    return { error: "Application not found." };
  }

  if (!(DECIDED_STATUSES as readonly string[]).includes(application.status)) {
    return {
      error:
        application.status === "PENDING_REVIEW"
          ? "This application is already under review."
          : "Only a decided application can be sent back for review.",
    };
  }

  const wasApproved = application.status === "APPROVED";

  // A reason is mandatory only when retracting an approval. That is the case
  // where the applicant has already been told good news and may be acting on
  // it, so "why" is owed to them — and to whoever reads the audit log later.
  if (wasApproved && !reason) {
    return {
      error: "Explain why the approval is being withdrawn — the applicant is told.",
    };
  }

  try {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "PENDING_REVIEW" },
    });
  } catch (error) {
    console.error("reopenApplication failed", error);
    return { error: "Could not reopen the application. Please try again." };
  }

  await recordAudit({
    action: "APPLICATION_REOPENED",
    actorUserId: session.user.id,
    subjectUserId: application.userId,
    targetType: "application",
    targetId: application.id,
    // The previous status is the point of the entry — it records what was
    // undone. `reason` is free text an admin typed, so only its presence is
    // stored, keeping the log free of prose about a person.
    metadata: { previousStatus: application.status, hasReason: Boolean(reason) },
  });

  // Same rule as decideApplication: a failed email must never undo a status
  // change that already committed.
  const { subject, html } = applicationReopenedEmail({
    name: application.user.name,
    wasApproved,
    reason: reason || null,
  });

  await sendEmail({ to: application.user.email, subject, html }).catch((error) => {
    console.error("reopenApplication: notification email failed", error);
  });

  revalidatePath(`/admin/applications/${application.id}`);
  revalidatePath("/admin");
  revalidatePath(`/applications/${application.id}`);
  revalidatePath("/dashboard");

  return { error: null };
}
