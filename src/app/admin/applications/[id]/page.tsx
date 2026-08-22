import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Square } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { findCategory, isCategoryValue } from "@/lib/categories";
import {
  INSTRUCTION_LANGUAGES,
  MEDICAL_PROFESSIONS,
  parseAnswers,
} from "@/lib/wizard";
import { requirementsFor, type Requirement } from "@/lib/checklists";
import { getDocumentDownloadUrl } from "@/lib/r2";
import { APPLICATION_STATUS_META } from "@/lib/application-status";
import { DOCUMENT_REVIEW_STATUS_META } from "@/lib/document-review-status";
import { DocumentReviewControl } from "@/components/admin/document-review-control";
import { DecideApplicationControl } from "@/components/admin/decide-application-control";
import type { Document } from "@/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // No ownership scoping — an admin can look at any application. There is
  // still an existence check: a bad id is a 404, same as everywhere else.
  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      status: true,
      data: true,
      fullNameLatin: true,
      passportNumber: true,
      passportExpiry: true,
      submittedAt: true,
      user: { select: { name: true, email: true, phone: true } },
      documents: true,
    },
  });

  if (!application || !isCategoryValue(application.category)) notFound();

  const category = findCategory(application.category)!;
  const answers = parseAnswers(application.data);
  const requirements = requirementsFor(category.value, answers);

  const documentsByCode = new Map<string, Document>(
    application.documents.map((d) => [d.requirementCode, d]),
  );

  // Presigned URLs are generated server-side, once, at render time — the
  // bucket itself is never public. Only rows with an actual uploaded file
  // need one.
  const downloadUrls = new Map<string, string>(
    await Promise.all(
      application.documents.map(
        async (d) => [d.requirementCode, await getDocumentDownloadUrl(d.storageKey)] as const,
      ),
    ),
  );

  const status = APPLICATION_STATUS_META[application.status];
  const canReview = application.status === "PENDING_REVIEW";

  const languageLabel = INSTRUCTION_LANGUAGES.find(
    (o) => o.value === answers.instructionLanguage,
  )?.labelEn;
  const professionLabel = MEDICAL_PROFESSIONS.find(
    (o) => o.value === answers.medicalProfession,
  )?.labelEn;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        Back to applications
      </Link>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-primary">
              {category.labelEn}
            </p>
            <h1 className="text-xl font-semibold text-card-foreground">
              {application.user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {application.user.email}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
          >
            {status.labelEn}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Full name (passport)</dt>
          <dd className="text-card-foreground">
            {application.fullNameLatin ?? "—"}
          </dd>

          <dt className="text-muted-foreground">Phone</dt>
          <dd className="text-card-foreground">
            {application.user.phone ?? "—"}
          </dd>

          <dt className="text-muted-foreground">Passport number</dt>
          <dd className="text-card-foreground">
            {application.passportNumber ?? "—"}
          </dd>

          <dt className="text-muted-foreground">Passport expiry</dt>
          <dd className="text-card-foreground">
            {application.passportExpiry
              ? dateFormatter.format(application.passportExpiry)
              : "—"}
          </dd>

          {languageLabel && (
            <>
              <dt className="text-muted-foreground">Programme language</dt>
              <dd className="text-card-foreground">{languageLabel}</dd>
            </>
          )}

          {professionLabel && (
            <>
              <dt className="text-muted-foreground">Profession</dt>
              <dd className="text-card-foreground">{professionLabel}</dd>
            </>
          )}

          <dt className="text-muted-foreground">Submitted</dt>
          <dd className="text-card-foreground">
            {application.submittedAt
              ? dateFormatter.format(application.submittedAt)
              : "—"}
          </dd>
        </dl>
      </div>

      <ul className="flex flex-col gap-3">
        {requirements.map((requirement) => (
          <DocumentRow
            key={requirement.code}
            applicationId={application.id}
            requirement={requirement}
            document={documentsByCode.get(requirement.code)}
            downloadUrl={downloadUrls.get(requirement.code)}
            canReview={canReview}
          />
        ))}
      </ul>

      {canReview ? (
        <DecideApplicationControl applicationId={application.id} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          This application has already been decided.
        </p>
      )}
    </div>
  );
}

function DocumentRow({
  applicationId,
  requirement,
  document,
  downloadUrl,
  canReview,
}: {
  applicationId: string;
  requirement: Requirement;
  document: Document | undefined;
  downloadUrl: string | undefined;
  canReview: boolean;
}) {
  const uploaded = Boolean(document);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        {uploaded ? (
          <CheckCircle2
            className="size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
        ) : (
          <Square
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}

        <div className="flex-1">
          <span className="block text-sm text-card-foreground">
            {requirement.labelEn}
          </span>
          {document && downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs text-primary underline-offset-4 hover:underline"
            >
              {document.fileName}
            </a>
          )}
        </div>

        {document && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_REVIEW_STATUS_META[document.reviewStatus].className}`}
          >
            {DOCUMENT_REVIEW_STATUS_META[document.reviewStatus].labelEn}
          </span>
        )}
      </div>

      {document && canReview && (
        <DocumentReviewControl
          applicationId={applicationId}
          requirementCode={requirement.code}
          defaultStatus={document.reviewStatus}
          defaultNote={document.adminNote}
        />
      )}
    </li>
  );
}
