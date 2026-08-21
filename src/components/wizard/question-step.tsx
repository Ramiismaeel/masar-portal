"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveQuestionStep } from "@/lib/actions/wizard";
import { EMPTY_WIZARD_STATE, STEP_IDENTITY } from "@/lib/wizard";
import { Button } from "@/components/ui/button";

type Option = { readonly value: string; readonly labelEn: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : "Save & finish"}
    </Button>
  );
}

export function QuestionStep({
  applicationId,
  legend,
  hint,
  options,
  defaultValue,
}: {
  applicationId: string;
  legend: string;
  hint?: string;
  options: readonly Option[];
  defaultValue?: string;
}) {
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
                {option.labelEn}
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
          Back
        </Button>
      </div>
    </form>
  );
}
