"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  decideApplication,
  type DecideApplicationState,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

const EMPTY_STATE: DecideApplicationState = { error: null };

function DecisionButton({
  decision,
  label,
  variant,
}: {
  decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  label: string;
  variant: "default" | "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    // A name+value submit button: the browser includes only the CLICKED
    // button's pair in the form data, so one <form> can hold all three
    // decisions without JS tracking which was pressed.
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={variant}
      disabled={pending}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function DecideApplicationControl({
  applicationId,
}: {
  applicationId: string;
}) {
  const [state, formAction] = useActionState(decideApplication, EMPTY_STATE);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="text-sm font-medium text-card-foreground">Decision</p>

      <div className="flex flex-wrap gap-2">
        <DecisionButton decision="APPROVED" label="Approve" variant="default" />
        <DecisionButton
          decision="NEEDS_REVISION"
          label="Request revision"
          variant="outline"
        />
        <DecisionButton decision="REJECTED" label="Reject" variant="destructive" />
      </div>

      <p className="text-xs text-muted-foreground">
        The applicant is emailed automatically. Leave notes on individual
        documents above so they know what to fix.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
