"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Link from "next/link";

import {
  submitApplication,
  type SubmitApplicationState,
} from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";

const EMPTY_STATE: SubmitApplicationState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Checklist");
  return (
    <Button type="submit" className="w-full" loading={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function SubmitApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const [state, formAction] = useActionState(submitApplication, EMPTY_STATE);
  const t = useTranslations("Checklist");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />

      {/* A declaration, not a consent tickbox. Ordinary documents here are
          processed under Art. 6(1)(b) (contract), so asking for "consent" we
          would ignore on withdrawal would weaken the lawful basis rather than
          add to it. This confirms ownership and accuracy, and records that the
          applicant was pointed at the privacy policy (Art. 13).
          `required` is convenience only — submitApplication re-checks it. */}
      <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-start">
        <input
          type="checkbox"
          name="privacyAccepted"
          required
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          {t.rich("submitDeclaration", {
            privacy: (chunks) => (
              <Link
                href="/datenschutz"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      <SubmitButton />
      {state.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
