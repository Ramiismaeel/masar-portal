import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findCategory, isCategoryValue } from "@/lib/categories";
import {
  INSTRUCTION_LANGUAGES,
  MEDICAL_PROFESSIONS,
  STEP_IDENTITY,
  STEP_QUESTION,
  hasQuestionStep,
  parseAnswers,
  totalSteps,
} from "@/lib/wizard";
import { WizardProgress } from "@/components/wizard/wizard-progress";
import { IdentityStep } from "@/components/wizard/identity-step";
import { QuestionStep } from "@/components/wizard/question-step";

/** Date column → the "YYYY-MM-DD" string <input type="date"> expects. */
function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ id }, { step: stepParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // Scoped by BOTH id and userId. A wrong or someone else's id yields null,
  // which becomes a 404 — never a 403, which would confirm the row exists.
  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      category: true,
      status: true,
      currentStep: true,
      data: true,
      fullNameLatin: true,
      passportNumber: true,
      passportExpiry: true,
      user: { select: { phone: true } },
    },
  });

  if (!application || !isCategoryValue(application.category)) notFound();

  const category = findCategory(application.category)!;

  // A submitted application is read-only.
  if (application.status !== "DRAFT") {
    redirect(`/dashboard?application=${application.id}`);
  }

  const total = totalSteps(category.value);

  // The URL chooses which step is displayed; the database decides how far the
  // user is allowed to go. Requesting ?step=1 before finishing step 0 clamps
  // back — so you cannot skip a step by editing the address bar, but you can
  // freely go back and edit an earlier answer.
  const requested =
    stepParam === undefined ? application.currentStep : Number(stepParam);
  const step = Math.max(
    STEP_IDENTITY,
    Math.min(
      Number.isFinite(requested) ? requested : STEP_IDENTITY,
      application.currentStep,
      total - 1,
    ),
  );

  const answers = parseAnswers(application.data);

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        Save and continue later
      </Link>

      <div className="mt-6 flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-primary">{category.labelEn}</p>
          <WizardProgress step={step} total={total} />
        </div>

        {step === STEP_IDENTITY && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-card-foreground">
              Your details
            </h1>
            <IdentityStep
              applicationId={application.id}
              defaults={{
                fullNameLatin: application.fullNameLatin ?? "",
                phone: application.user.phone ?? "",
                passportNumber: application.passportNumber ?? "",
                passportExpiry: toDateInputValue(application.passportExpiry),
              }}
            />
          </div>
        )}

        {step === STEP_QUESTION && hasQuestionStep(category.value) && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-card-foreground">
              One more question
            </h1>

            {category.value === "STUDENT" && (
              <QuestionStep
                applicationId={application.id}
                legend="Is your programme taught in German or English?"
                hint="If it is taught in English, you will also need an English language certificate."
                options={INSTRUCTION_LANGUAGES}
                defaultValue={answers.instructionLanguage}
              />
            )}

            {category.value === "MEDICAL" && (
              <QuestionStep
                applicationId={application.id}
                legend="What is your profession?"
                hint="Doctors are asked for one extra document (بيان معاودة)."
                options={MEDICAL_PROFESSIONS}
                defaultValue={answers.medicalProfession}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
