"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";

import {
  uploadDocument,
  type UploadDocumentState,
} from "@/lib/actions/documents";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY_STATE: UploadDocumentState = { error: null };

/**
 * A real, clearly-labelled button — not a bare native file input. The input
 * itself is `sr-only` (in the layout/focus tree, just not painted) rather
 * than `hidden` (display: none, which would drop it from keyboard/tab
 * order): the label is what's visible and styled as a button, but Tab still
 * reaches the actual input and Space/Enter still opens the file picker.
 */
function FileTrigger({
  id,
  label,
  primary,
}: {
  id: string;
  label: string;
  primary: boolean;
}) {
  const { pending } = useFormStatus();
  const t = useTranslations("Checklist");

  return (
    <>
      {/* Input comes first so the label below can react to its focus state
          via the `peer` mechanism — a keyboard user tabbing to this (sr-only,
          not display:none, so still focusable) input needs to SEE that focus
          land somewhere, and the label is the only visible element here. */}
      <input
        id={id}
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
        className="peer sr-only"
      />

      <label
        htmlFor={id}
        className={cn(
          buttonVariants({
            variant: primary ? "default" : "outline",
            size: primary ? "default" : "sm",
          }),
          "w-full cursor-pointer peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          pending && "pointer-events-none opacity-50",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("uploading")}
          </>
        ) : (
          <>
            <Upload className="size-4" aria-hidden="true" />
            {label}
          </>
        )}
      </label>
    </>
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

      <FileTrigger
        id={`upload-${requirementCode}`}
        label={isReplace ? t("replace") : t("upload")}
        // The empty-slot case is the one thing on the row that needs a
        // user's attention — a full-width primary button. Once something is
        // already uploaded, replacing it is a lower-emphasis secondary
        // action next to the filename, not the row's main call to action.
        primary={!isReplace}
      />

      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
