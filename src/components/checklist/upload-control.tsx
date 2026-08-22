"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import {
  uploadDocument,
  type UploadDocumentState,
} from "@/lib/actions/documents";

const EMPTY_STATE: UploadDocumentState = { error: null };

function FileInput({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Checklist");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>

      <input
        type="file"
        name="file"
        // Client-side accept is a UX convenience only — the Server Action
        // re-validates the actual Content-Type, which is the real control.
        accept="application/pdf,image/jpeg,image/png"
        required
        disabled={pending}
        aria-label={label}
        // Submits the instant a file is chosen — no separate "Upload" tap.
        // There's nothing to review first (no preview, nothing partial worth
        // pausing on), so the extra step was only friction — worse on a
        // phone, and worse still for someone new to this kind of form.
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-full flex-1 text-xs cursor-pointer hover:text-primary text-muted-foreground file:me-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground disabled:opacity-50"
      />

      {pending && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("uploading")}
        </span>
      )}
    </div>
  );
}

export function UploadControl({
  applicationId,
  requirementCode,
  isReplace,
}: {
  applicationId: string;
  requirementCode: string;
  /** false for a first-time slot, true once something is already there. */
  isReplace: boolean;
}) {
  const [state, formAction] = useActionState(uploadDocument, EMPTY_STATE);
  const t = useTranslations("Checklist");

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="requirementCode" value={requirementCode} />

      <FileInput label={isReplace ? t("replace") : t("upload")} />

      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
