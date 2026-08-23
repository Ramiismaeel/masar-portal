"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Undo2 } from "lucide-react";

import {
  reopenApplication,
  type ReopenApplicationState,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

const EMPTY_STATE: ReopenApplicationState = { error: null };

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" loading={pending}>
      {pending ? "Reopening…" : label}
    </Button>
  );
}

/**
 * Only rendered for an application that already has a decision. Two-step, in
 * line with every other destructive control in this app — reopening emails
 * the applicant, so it shouldn't be one stray click away.
 */
export function ReopenApplicationControl({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(reopenApplication, EMPTY_STATE);

  const wasApproved = currentStatus === "APPROVED";

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-card-foreground">
          Decision already made
        </p>
        <p className="text-xs text-muted-foreground">
          This application is {currentStatus.replace("_", " ").toLowerCase()}.
          Send it back to the review queue if that was a mistake or new
          information has come in.
        </p>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            <Undo2 className="size-3.5" aria-hidden="true" />
            Reopen for review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <input type="hidden" name="applicationId" value={applicationId} />

      <p className="text-sm font-medium text-card-foreground">
        Reopen this application?
      </p>

      <p className="text-xs text-muted-foreground">
        {wasApproved
          ? "The applicant was already told this was approved. They will be emailed that the approval is on hold — a reason is required."
          : "The applicant will be emailed that it is back under review. Their uploaded documents and your per-document notes are kept."}
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-card-foreground">
          Reason {wasApproved ? "(required)" : "(optional)"}
        </span>
        <textarea
          name="reason"
          rows={2}
          required={wasApproved}
          placeholder={
            wasApproved
              ? "Why is the approval being withdrawn?"
              : "Shown to the applicant if provided"
          }
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          label={wasApproved ? "Withdraw approval" : "Reopen for review"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
