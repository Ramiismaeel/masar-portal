"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";

import { shrinkImage } from "@/lib/shrink-image";

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
  const [preparing, setPreparing] = useState(false);
  const t = useTranslations("Checklist");

  const busy = pending || preparing;

  /**
   * Shrinks an image before submitting, then swaps it back into the input so
   * the form sends the smaller file.
   *
   * `input.files` looks read-only but is assignable from a DataTransfer's
   * FileList — that is the supported way to replace a file input's contents.
   */
  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Captured BEFORE the first await. React resets `event.currentTarget` to
    // null once the handler returns, and an async handler returns at its
    // first await — so reading it afterwards would throw.
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setPreparing(true);
    try {
      const prepared = await shrinkImage(file);

      if (prepared !== file) {
        const transfer = new DataTransfer();
        transfer.items.add(prepared);
        input.files = transfer.files;
      }
    } finally {
      setPreparing(false);
    }

    input.form?.requestSubmit();
  }

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
        // Deliberately `pending`, NOT `busy`. Disabling this input while
        // `preparing` is true breaks the upload: a disabled control is
        // excluded from FormData, and because React state updates are
        // asynchronous, the input is still disabled in the DOM at the moment
        // requestSubmit() runs — so the Server Action receives a form with no
        // file and rejects it with "Choose a file to upload."
        // Nothing is lost by leaving it enabled: the input is sr-only and the
        // label below already has pointer-events-none while busy.
        disabled={pending}
        aria-label={label}
        // Submits the instant a file is chosen — no separate "Upload" tap.
        // There's nothing to review first (no preview, nothing partial worth
        // pausing on), so the extra step was only friction — worse on a
        // phone, and worse still for someone new to this kind of form.
        onChange={handleChange}
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
          busy && "pointer-events-none opacity-50",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {/* Shrinking a 12 MP photo takes a moment on a phone, and it
                happens before any upload starts — so it needs its own label
                rather than silently sitting on "Uploading…". */}
            {preparing ? t("preparing") : t("uploading")}
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
