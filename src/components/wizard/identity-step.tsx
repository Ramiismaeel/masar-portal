"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Wizard");
  return (
    <Button type="submit" size="lg" loading={pending}>
      {pending ? t("saving") : t("saveAndContinue")}
    </Button>
  );
}

export function IdentityStep({
  applicationId,
  defaults,
  phonePattern,
}: {
  applicationId: string;
  defaults: {
    fullNameLatin: string;
    phone: string;
    passportNumber: string;
    passportExpiry: string; // "YYYY-MM-DD" or ""
  };
  /** Same regex the Server Action validates with (its `.source`) — one rule,
   *  enforced natively by the browser as you type instead of only after a
   *  round-trip. */
  phonePattern: string;
}) {
  const t = useTranslations("Wizard");
  const [state, formAction] = useActionState(
    saveIdentityStep,
    EMPTY_WIZARD_STATE,
  );

  // Controlled, not defaultValue: a validation error re-renders this form
  // with the SAME typed values still showing (state lives here, in the
  // client, not derived from the server's stale defaults on every render) —
  // an uncontrolled field driven by defaultValue only sets its value once on
  // mount, but this app has already hit cases (see docs/roadmap.md "i18n")
  // where a Server Action round-trip recreated the input's DOM node and
  // silently reset it back to the original server value, wiping whatever
  // the applicant had just typed. Controlled state can't be reset that way.
  const [fullNameLatin, setFullNameLatin] = useState(defaults.fullNameLatin);
  const [phone, setPhone] = useState(defaults.phone);
  const [passportNumber, setPassportNumber] = useState(defaults.passportNumber);
  const [passportExpiry, setPassportExpiry] = useState(defaults.passportExpiry);

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
        <Label htmlFor="fullNameLatin">{t("fullNameLatin")}</Label>
        <Input
          id="fullNameLatin"
          name="fullNameLatin"
          value={fullNameLatin}
          onChange={(e) => setFullNameLatin(e.target.value)}
          placeholder={t("fullNameLatinPlaceholder")}
          autoComplete="name"
          dir="ltr"
          required
          aria-invalid={Boolean(state.fieldErrors.fullNameLatin)}
        />
        <p className="text-xs text-muted-foreground">
          {t("fullNameLatinHint")}
        </p>
        <FieldError message={state.fieldErrors.fullNameLatin} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+963 …"
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          pattern={phonePattern}
          required
          aria-invalid={Boolean(state.fieldErrors.phone)}
        />
        <p className="text-xs text-muted-foreground">{t("phoneHint")}</p>
        <FieldError message={state.fieldErrors.phone} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passportNumber">{t("passportNumber")}</Label>
        <Input
          id="passportNumber"
          name="passportNumber"
          value={passportNumber}
          onChange={(e) => setPassportNumber(e.target.value)}
          autoCapitalize="characters"
          dir="ltr"
          required
          aria-invalid={Boolean(state.fieldErrors.passportNumber)}
          className="uppercase"
        />
        <FieldError message={state.fieldErrors.passportNumber} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passportExpiry">{t("passportExpiry")}</Label>
        <Input
          id="passportExpiry"
          name="passportExpiry"
          type="date"
          value={passportExpiry}
          onChange={(e) => setPassportExpiry(e.target.value)}
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
