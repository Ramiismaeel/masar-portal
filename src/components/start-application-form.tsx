"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createApplication,
  type CreateApplicationState,
} from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";

const initialState: CreateApplicationState = { error: null };

function SubmitButton({ disabled }: { disabled: boolean }) {
  // useFormStatus must live in a child of <form> — that is how it finds the form.
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending || disabled}>
      {pending ? "Creating…" : "Start application"}
    </Button>
  );
}

export function StartApplicationForm({
  category,
  emailVerified,
}: {
  category: string;
  emailVerified: boolean;
}) {
  const [state, formAction] = useActionState(createApplication, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* The server re-validates this. The hidden field is convenience, not security. */}
      <input type="hidden" name="category" value={category} />

      {!emailVerified && (
        <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          Confirm your email address before starting an application. Check your
          inbox — you can resend the message from your dashboard.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton disabled={!emailVerified} />
      </div>
    </form>
  );
}
