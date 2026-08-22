"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { reviewDocument, type ReviewDocumentState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import type { ReviewStatus } from "@/generated/prisma/client";

const EMPTY_STATE: ReviewDocumentState = { error: null };

const OPTIONS = [
  { value: "APPROVED", label: "Approve" },
  { value: "NEEDS_REVISION", label: "Request changes" },
  { value: "REJECTED", label: "Reject" },
] as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save review"}
    </Button>
  );
}

export function DocumentReviewControl({
  applicationId,
  requirementCode,
  defaultStatus,
  defaultNote,
}: {
  applicationId: string;
  requirementCode: string;
  defaultStatus: ReviewStatus;
  defaultNote: string | null;
}) {
  const [state, formAction] = useActionState(reviewDocument, EMPTY_STATE);
  // PENDING isn't one of the three decisions an admin can pick — default the
  // control to Approve rather than leaving nothing selected.
  const [status, setStatus] = useState<(typeof OPTIONS)[number]["value"]>(
    defaultStatus === "PENDING" ? "APPROVED" : defaultStatus,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="requirementCode" value={requirementCode} />

      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-1.5 text-sm text-card-foreground"
          >
            <input
              type="radio"
              name="reviewStatus"
              value={option.value}
              checked={status === option.value}
              onChange={() => setStatus(option.value)}
              className="accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>

      {status !== "APPROVED" && (
        <textarea
          name="adminNote"
          defaultValue={defaultNote ?? ""}
          placeholder="What needs to change? The applicant sees this note."
          rows={2}
          required
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      )}

      <div className="flex items-center gap-3">
        <SaveButton />
        {state.error && (
          <span role="alert" className="text-xs text-destructive">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
