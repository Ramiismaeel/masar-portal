import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Square } from "lucide-react";

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
import { UploadControl } from "@/components/checklist/upload-control";
import { SubmitApplicationButton } from "@/components/checklist/submit-application-button";
import { DeleteDocumentControl } from "@/components/checklist/delete-document-control";
import { DeleteApplicationControl } from "@/components/checklist/delete-application-control";

type UploadedDocument = { fileName: string };

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
      documents: { select: { requirementCode: true, fileName: true } },
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

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        Back to dashboard
      </Link>

      <div className="mt-6 flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-primary">
              {category.labelEn}
            </p>
            <h1 className="text-xl font-semibold text-card-foreground">
              Your document checklist
            </h1>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
          >
            {status.labelEn}
          </span>
        </div>

        <ChecklistProgressBar
          uploaded={progress.uploaded}
          total={progress.total}
        />

        {!canUpload && (
          <div className="rounded-lg border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            {application.status === "PENDING_REVIEW"
              ? "Your application is being reviewed. Documents are locked until a decision is made."
              : "This application has been approved. Documents are locked."}
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
            />
          ))}
        </ul>

        {application.status === "DRAFT" && progress.canSubmit && (
          <SubmitApplicationButton applicationId={application.id} />
        )}

        {application.status === "DRAFT" && (
          <Link
            href={`/applications/${application.id}/wizard?step=${STEP_IDENTITY}`}
            className="text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Edit your answers
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

function ChecklistProgressBar({
  uploaded,
  total,
}: {
  uploaded: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((uploaded / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {uploaded} of {total} required documents uploaded
      </p>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={uploaded}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${uploaded} of ${total} required documents uploaded`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RequirementRow({
  applicationId,
  requirement,
  document,
  canUpload,
}: {
  applicationId: string;
  requirement: Requirement;
  document: UploadedDocument | undefined;
  canUpload: boolean;
}) {
  const uploaded = Boolean(document);

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
            {requirement.labelEn}
          </span>
          {/* dir="rtl" isolates just this span's shaping/punctuation — the
              page itself stays LTR until Phase 7 adds real language
              switching. This is a bilingual label, not a translated page. */}
          <span dir="rtl" className="block text-sm text-muted-foreground">
            {requirement.labelAr}
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
            Optional
          </span>
        )}
      </div>

      {canUpload && (
        <UploadControl
          // Keyed by the current filename so a successful upload/replace
          // remounts this form with a clean file input and cleared error —
          // otherwise the native input would keep showing the just-uploaded
          // filename as still "chosen" after auto-submitting.
          key={document?.fileName ?? "empty"}
          applicationId={applicationId}
          requirementCode={requirement.code}
          label={uploaded ? "Replace" : "Upload"}
        />
      )}
    </li>
  );
}
