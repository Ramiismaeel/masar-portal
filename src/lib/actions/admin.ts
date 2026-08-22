"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import { applicationDecisionEmail } from "@/lib/emails/application-decision";
import { findRequirement } from "@/lib/checklists";
import { isCategoryValue } from "@/lib/categories";

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
    select: { status: true, category: true },
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
