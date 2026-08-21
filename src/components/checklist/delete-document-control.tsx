"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteDocument, type DeleteDocumentState } from "@/lib/actions/documents";

const EMPTY_STATE: DeleteDocumentState = { error: null };

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Removing…" : "Confirm"}
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
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteDocument, EMPTY_STATE);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="requirementCode" value={requirementCode} />
      <span className="text-xs text-muted-foreground">Remove?</span>
      <ConfirmButton />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-muted-foreground hover:underline"
      >
        Cancel
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}
