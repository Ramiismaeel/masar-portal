import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Square } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findCategory, isCategoryValue } from "@/lib/categories";
import { isWizardComplete, parseAnswers, STEP_IDENTITY } from "@/lib/wizard";
import { canUploadInStatus } from "@/lib/uploads";
import {
  checklistProgress,
  requirementsFor,
  type Requirement,
} from "@/lib/checklists";
import { APPLICATION_STATUS_META } from "@/lib/application-status";
import { DOCUMENT_REVIEW_STATUS_META } from "@/lib/document-review-status";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";
import { UploadControl } from "@/components/checklist/upload-control";
import { SubmitApplicationButton } from "@/components/checklist/submit-application-button";
import { DeleteDocumentControl } from "@/components/checklist/delete-document-control";
import { DeleteApplicationControl } from "@/components/checklist/delete-application-control";
import type { ReviewStatus } from "@/generated/prisma/client";

type UploadedDocument = {
  fileName: string;
  reviewStatus: ReviewStatus;
  adminNote: string | null;
};

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // Scoped by BOTH id and userId, same as the wizard page: a wrong or someone
  // else's id must yield 404, never 403 — a 403 confirms the row exists.
  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      category: true,
      status: true,
      currentStep: true,
      data: true,
      documents: {
        select: {
          requirementCode: true,
          fileName: true,
          reviewStatus: true,
          adminNote: true,
        },
      },
    },
  });

  if (!application || !isCategoryValue(application.category)) notFound();

  const category = findCategory(application.category)!;

  // The checklist depends on the wizard's answers (instructionLanguage /
  // medicalProfession). Someone landing here by editing the URL before
  // finishing the wizard goes back to finish it first.
  if (!isWizardComplete(category.value, application.currentStep)) {
    redirect(`/applications/${application.id}/wizard`);
  }

  const answers = parseAnswers(application.data);
  const requirements = requirementsFor(category.value, answers);

  const documentsByCode = new Map<string, UploadedDocument>(
    application.documents.map((d) => [d.requirementCode, d]),
  );
  const uploadedCodes = [...documentsByCode.keys()];

  const progress = checklistProgress(category.value, answers, uploadedCodes);
  const status = APPLICATION_STATUS_META[application.status];
  const canUpload = canUploadInStatus(application.status);

  const t = await getTranslations("Checklist");
  const common = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {common("backToDashboard")}
      </Link>

      <div className="mt-6 flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-primary">
              {pick(locale, category.labelEn, category.labelAr)}
            </p>
            <h1 className="text-xl font-semibold text-card-foreground">
              {t("title")}
            </h1>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
          >
            {pick(locale, status.labelEn, status.labelAr)}
          </span>
        </div>

        <ChecklistProgressBar uploaded={progress.uploaded} total={progress.total} />

        {!canUpload && (
          <div className="rounded-lg border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            {application.status === "PENDING_REVIEW"
              ? t("lockedReview")
              : t("lockedApproved")}
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {requirements.map((requirement) => (
            <RequirementRow
              key={requirement.code}
              applicationId={application.id}
              requirement={requirement}
              document={documentsByCode.get(requirement.code)}
              canUpload={canUpload}
              locale={locale}
            />
          ))}
        </ul>

        {/* canUpload's status set doubles as "resubmittable" — DRAFT is the
            first submission, REJECTED/NEEDS_REVISION is a resubmission after
            the applicant has acted on admin feedback. submitApplication
            enforces the same set server-side. */}
        {canUpload && progress.canSubmit && (
          <SubmitApplicationButton applicationId={application.id} />
        )}

        {application.status === "DRAFT" && (
          <Link
            href={`/applications/${application.id}/wizard?step=${STEP_IDENTITY}`}
            className="text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("editAnswers")}
          </Link>
        )}

        {/* Deletable only before submission — matches canUploadInStatus's
            DRAFT case, but narrower on purpose: REJECTED/NEEDS_REVISION can
            still be edited, but they've already been seen by an admin once,
            so deleting the application itself (not just a document) stops
            there. */}
        {application.status === "DRAFT" && (
          <DeleteApplicationControl applicationId={application.id} />
        )}
      </div>
    </div>
  );
}

async function ChecklistProgressBar({
  uploaded,
  total,
}: {
  uploaded: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((uploaded / total) * 100);
  const t = await getTranslations("Checklist");
  const label = t("uploadedOf", { uploaded, total });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={uploaded}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

async function RequirementRow({
  applicationId,
  requirement,
  document,
  canUpload,
  locale,
}: {
  applicationId: string;
  requirement: Requirement;
  document: UploadedDocument | undefined;
  canUpload: boolean;
  locale: Locale;
}) {
  const uploaded = Boolean(document);
  const t = await getTranslations("Checklist");

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        {uploaded ? (
          <CheckCircle2
            className="size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
        ) : (
          // A hollow circle reads as an unchecked radio button — an
          // interactive affordance that does nothing until uploads exist.
          // A square doesn't carry that expectation.
          <Square
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}

        <div className="flex-1">
          <span className="block text-sm text-card-foreground">
            {pick(locale, requirement.labelEn, requirement.labelAr)}
          </span>
          {document && (
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {document.fileName}
              </span>
              {canUpload && (
                <DeleteDocumentControl
                  applicationId={applicationId}
                  requirementCode={requirement.code}
                />
              )}
            </div>
          )}
        </div>

        {!requirement.required && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {t("optional")}
          </span>
        )}

        {/* An admin decision on THIS file — separate from the Optional tag
            above, which is a checklist property, not a review outcome. */}
        {document && document.reviewStatus !== "PENDING" && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_REVIEW_STATUS_META[document.reviewStatus].className}`}
          >
            {pick(
              locale,
              DOCUMENT_REVIEW_STATUS_META[document.reviewStatus].labelEn,
              DOCUMENT_REVIEW_STATUS_META[document.reviewStatus].labelAr,
            )}
          </span>
        )}
      </div>

      {document?.adminNote && (
        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("noteFromMasar")}{" "}
          </span>
          {document.adminNote}
        </p>
      )}

      {canUpload && (
        <UploadControl
          // Keyed by the current filename so a successful upload/replace
          // remounts this form with a clean file input and cleared error —
          // otherwise the native input would keep showing the just-uploaded
          // filename as still "chosen" after auto-submitting.
          key={document?.fileName ?? "empty"}
          applicationId={applicationId}
          requirementCode={requirement.code}
          isReplace={uploaded}
        />
      )}
    </li>
  );
}
