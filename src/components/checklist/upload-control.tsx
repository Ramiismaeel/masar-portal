"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";

import { shrinkImage } from "@/lib/shrink-image";
import { MAX_FILE_SIZE_BYTES } from "@/lib/uploads";
import { createUploadTicket, finalizeUpload } from "@/lib/actions/documents";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Upload happens in three steps rather than one form submission, because the
 * file never travels through a Server Action:
 *
 *   1. ask the server for a one-time signed URL  (tiny request)
 *   2. PUT the file straight to R2               (the big one — no Vercel)
 *   3. tell the server it landed; it scans and promotes it
 *
 * Step 2 is what makes large files possible at all: Vercel rejects any
 * function request body over 4.5 MB at the edge, so an 8 MB PDF can never
 * reach a Server Action. Going directly to storage sidesteps that completely.
 *
 * Because this is a sequence and not a single submit, it uses explicit state
 * instead of useActionState/useFormStatus.
 */
type Phase = "idle" | "preparing" | "uploading" | "checking";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Checklist");

  const busy = phase !== "idle";
  const id = `upload-${requirementCode}`;

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Captured BEFORE the first await: React resets `event.currentTarget` to
    // null once the handler returns, and an async handler returns at its first
    // await, so reading it later would throw.
    const input = event.currentTarget;
    const chosen = input.files?.[0];
    if (!chosen) return;

    setError(null);

    try {
      setPhase("preparing");
      // Shrinking is what keeps a phone photo under the virus scanner's size
      // limit, so it still matters even though transport no longer caps us.
      const file = await shrinkImage(chosen);

      if (file.size > MAX_FILE_SIZE_BYTES) {
        const limitMb = Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024));
        setError(t("tooLargeToSend", { limit: limitMb }));
        return;
      }

      const ticketForm = new FormData();
      ticketForm.set("applicationId", applicationId);
      ticketForm.set("requirementCode", requirementCode);
      ticketForm.set("size", String(file.size));

      const ticketState = await createUploadTicket(
        { error: null, ticket: null },
        ticketForm,
      );

      if (!ticketState.ticket) {
        setError(ticketState.error ?? t("uploadFailed"));
        return;
      }

      setPhase("uploading");
      // No content-length header set by hand — browsers forbid that and set it
      // themselves. It matches because the server signed for exactly
      // `file.size`; R2 rejects any other length with a 403.
      const put = await fetch(ticketState.ticket.uploadUrl, {
        method: "PUT",
        body: file,
      });

      if (!put.ok) {
        console.error("[upload] R2 PUT failed", put.status, put.statusText);
        setError(t("uploadFailed"));
        return;
      }

      setPhase("checking");
      const finalizeForm = new FormData();
      finalizeForm.set("applicationId", applicationId);
      finalizeForm.set("requirementCode", requirementCode);
      finalizeForm.set("quarantineKey", ticketState.ticket.quarantineKey);
      finalizeForm.set("fileName", file.name);

      const result = await finalizeUpload({ error: null }, finalizeForm);

      if (result.error) {
        setError(result.error);
        return;
      }

      // The action revalidated the path, but this was a direct call rather
      // than a form submission, so nothing re-rendered on its own.
      router.refresh();
    } catch (cause) {
      console.error("[upload] unexpected failure", cause);
      setError(t("uploadFailed"));
    } finally {
      setPhase("idle");
      // Clear the input so picking the SAME file again still fires `change`.
      input.value = "";
    }
  }

  const busyLabel =
    phase === "preparing"
      ? t("preparing")
      : phase === "checking"
        ? t("checking")
        : t("uploading");

  return (
    <div className="flex flex-col gap-1.5">
      {/* Input first so the label can react to its focus state via `peer` —
          a keyboard user tabbing to this sr-only (not display:none, so still
          focusable) input needs to SEE focus land somewhere. */}
      <input
        id={id}
        type="file"
        // A UX convenience only; the server re-derives the real type from the
        // file's magic bytes and trusts nothing sent from here.
        accept="application/pdf,image/jpeg,image/png"
        disabled={busy}
        aria-label={isReplace ? t("replace") : t("upload")}
        onChange={handleChange}
        className="peer sr-only"
      />

      <label
        htmlFor={id}
        className={cn(
          buttonVariants({
            variant: isReplace ? "outline" : "default",
            size: isReplace ? "sm" : "default",
          }),
          "w-full cursor-pointer peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          busy && "pointer-events-none opacity-50",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {busyLabel}
          </>
        ) : (
          <>
            <Upload className="size-4" aria-hidden="true" />
            {isReplace ? t("replace") : t("upload")}
          </>
        )}
      </label>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
