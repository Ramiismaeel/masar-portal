"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { deleteDocument, type DeleteDocumentState } from "@/lib/actions/documents";

const EMPTY_STATE: DeleteDocumentState = { error: null };

function ConfirmButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Checklist");
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? t("removing") : t("confirm")}
    </button>
  );
}

export function DeleteDocumentControl({
  applicationId,
  requirementCode,
}: {
  applicationId: string;
  requirementCode: string;
}) {
  const t = useTranslations("Checklist");
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteDocument, EMPTY_STATE);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
      >
        {t("delete")}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="requirementCode" value={requirementCode} />
      <span className="text-xs text-muted-foreground">
        {t("removeQuestion")}
      </span>
      <ConfirmButton />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-muted-foreground hover:underline"
      >
        {t("cancel")}
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}
