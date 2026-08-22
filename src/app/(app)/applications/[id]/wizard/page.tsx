import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

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
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";
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

  // A submitted application is read-only — the checklist page is the correct
  // place for it now, not the wizard.
  if (application.status !== "DRAFT") {
    redirect(`/applications/${application.id}`);
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
  const t = await getTranslations("Wizard");
  const locale = (await getLocale()) as Locale;

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("saveAndContinueLater")}
      </Link>

      <div className="mt-6 flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-primary">
            {pick(locale, category.labelEn, category.labelAr)}
          </p>
          <WizardProgress step={step} total={total} />
        </div>

        {step === STEP_IDENTITY && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-card-foreground">
              {t("yourDetails")}
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
              {t("oneMoreQuestion")}
            </h1>

            {category.value === "STUDENT" && (
              <QuestionStep
                applicationId={application.id}
                legend={t("studentLegend")}
                hint={t("studentHint")}
                options={INSTRUCTION_LANGUAGES}
                defaultValue={answers.instructionLanguage}
                locale={locale}
              />
            )}

            {category.value === "MEDICAL" && (
              <QuestionStep
                applicationId={application.id}
                legend={t("medicalLegend")}
                hint={t("medicalHint")}
                options={MEDICAL_PROFESSIONS}
                defaultValue={answers.medicalProfession}
                locale={locale}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
