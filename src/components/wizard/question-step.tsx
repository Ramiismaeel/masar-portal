"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { saveQuestionStep } from "@/lib/actions/wizard";
import { EMPTY_WIZARD_STATE, STEP_IDENTITY } from "@/lib/wizard";
import { Button } from "@/components/ui/button";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";

type Option = { readonly value: string; readonly labelEn: string; readonly labelAr: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Wizard");
  return (
    <Button type="submit" size="lg" loading={pending}>
      {pending ? t("saving") : t("saveAndFinish")}
    </Button>
  );
}

export function QuestionStep({
  applicationId,
  legend,
  hint,
  options,
  defaultValue,
  locale,
  showSensitiveConsent,
  sensitiveConsentGiven,
}: {
  applicationId: string;
  legend: string;
  hint?: string;
  options: readonly Option[];
  defaultValue?: string;
  locale: Locale;
  /** Only Medical applications ever collect a criminal record extract or a
   *  medical report — see needsSensitiveDataConsent() in src/lib/wizard.ts. */
  showSensitiveConsent?: boolean;
  /** true once Application.sensitiveDataConsentAt is already set — the
   *  checkbox then just reflects that, and re-checking it isn't required to
   *  save a later edit. */
  sensitiveConsentGiven?: boolean;
}) {
  const t = useTranslations("Wizard");
  const [state, formAction] = useActionState(
    saveQuestionStep,
    EMPTY_WIZARD_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-medium text-foreground">
          {legend}
        </legend>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}

        <div className="mt-1 flex flex-col gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3.5 text-start transition-colors hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              {/* A native radio: keyboard arrows, form submission and screen
                  reader semantics all work with no JavaScript. */}
              <input
                type="radio"
                name="answer"
                value={option.value}
                defaultChecked={defaultValue === option.value}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-card-foreground">
                {pick(locale, option.labelEn, option.labelAr)}
              </span>
            </label>
          ))}
        </div>

        {state.fieldErrors.answer && (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors.answer}
          </p>
        )}
      </fieldset>

      {showSensitiveConsent && (
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-start has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="checkbox"
              name="sensitiveDataConsent"
              defaultChecked={sensitiveConsentGiven}
              disabled={sensitiveConsentGiven}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-sm text-card-foreground">
              {t("sensitiveConsentLabel")}{" "}
              <Link
                href="/datenschutz#sensitive-documents"
                target="_blank"
                className="underline hover:text-foreground"
              >
                {t("sensitiveConsentLink")}
              </Link>
            </span>
          </label>

          {state.fieldErrors.sensitiveDataConsent && (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.sensitiveDataConsent}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton />
        <Button
          variant="ghost"
          size="lg"
          nativeButton={false}
          render={
            <Link
              href={`/applications/${applicationId}/wizard?step=${STEP_IDENTITY}`}
            />
          }
        >
          {t("back")}
        </Button>
      </div>
    </form>
  );
}
