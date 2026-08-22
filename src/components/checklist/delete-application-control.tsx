"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteApplication,
  type DeleteApplicationState,
} from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";

const EMPTY_STATE: DeleteApplicationState = { error: null };

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Deleting…" : "Yes, delete this application"}
    </Button>
  );
}

export function DeleteApplicationControl({
  applicationId,
}: {
  applicationId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteApplication, EMPTY_STATE);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-center text-sm text-destructive underline-offset-4 hover:underline"
      >
        Delete this application
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-center text-sm text-destructive">
        This permanently deletes this application and every document uploaded
        to it. This cannot be undone.
      </p>
      <form
        action={formAction}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <input type="hidden" name="applicationId" value={applicationId} />
        <ConfirmButton />
        <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
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
