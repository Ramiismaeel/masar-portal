"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import {
  deleteApplication,
  type DeleteApplicationState,
} from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";

const EMPTY_STATE: DeleteApplicationState = { error: null };

function ConfirmButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Checklist");
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? t("deleting") : t("deleteApplicationConfirm")}
    </Button>
  );
}

export function DeleteApplicationControl({
  applicationId,
}: {
  applicationId: string;
}) {
  const t = useTranslations("Checklist");
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteApplication, EMPTY_STATE);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-center text-sm text-destructive underline-offset-4 hover:underline"
      >
        {t("deleteApplication")}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-center text-sm text-destructive">
        {t("deleteApplicationWarning")}
      </p>
      <form
        action={formAction}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <input type="hidden" name="applicationId" value={applicationId} />
        <ConfirmButton />
        <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
          {t("cancel")}
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
