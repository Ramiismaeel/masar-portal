"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

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
    <Button type="submit" className="w-full" disabled={pending}>
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

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <SubmitButton />
      {state.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
