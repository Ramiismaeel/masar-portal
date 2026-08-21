"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveIdentityStep } from "@/lib/actions/wizard";
import { EMPTY_WIZARD_STATE } from "@/lib/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : "Save & continue"}
    </Button>
  );
}

export function IdentityStep({
  applicationId,
  defaults,
}: {
  applicationId: string;
  defaults: {
    fullNameLatin: string;
    phone: string;
    passportNumber: string;
    passportExpiry: string; // "YYYY-MM-DD" or ""
  };
}) {
  const [state, formAction] = useActionState(
    saveIdentityStep,
    EMPTY_WIZARD_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="fullNameLatin">Full name (Latin letters)</Label>
        <Input
          id="fullNameLatin"
          name="fullNameLatin"
          defaultValue={defaults.fullNameLatin}
          placeholder="As printed in your passport"
          autoComplete="name"
          dir="ltr"
          required
          aria-invalid={Boolean(state.fieldErrors.fullNameLatin)}
        />
        <p className="text-xs text-muted-foreground">
          Exactly as it appears in the machine-readable line of your passport.
        </p>
        <FieldError message={state.fieldErrors.fullNameLatin} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaults.phone}
          placeholder="+963 …"
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          required
          aria-invalid={Boolean(state.fieldErrors.phone)}
        />
        <FieldError message={state.fieldErrors.phone} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passportNumber">Passport number</Label>
        <Input
          id="passportNumber"
          name="passportNumber"
          defaultValue={defaults.passportNumber}
          autoCapitalize="characters"
          dir="ltr"
          required
          aria-invalid={Boolean(state.fieldErrors.passportNumber)}
          className="uppercase"
        />
        <FieldError message={state.fieldErrors.passportNumber} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passportExpiry">Passport expiry date</Label>
        <Input
          id="passportExpiry"
          name="passportExpiry"
          type="date"
          defaultValue={defaults.passportExpiry}
          dir="ltr"
          required
          aria-invalid={Boolean(state.fieldErrors.passportExpiry)}
        />
        <FieldError message={state.fieldErrors.passportExpiry} />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
