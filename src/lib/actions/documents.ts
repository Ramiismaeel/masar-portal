"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { prisma } from "@/lib/prisma";
import {
  r2,
  R2_BUCKET,
  QUARANTINE_PREFIX,
  getQuarantineUploadUrl,
  getObjectBytes,
  deleteObjectQuietly,
} from "@/lib/r2";
import { scanFileForViruses } from "@/lib/virus-scan";
import { normalizeUpload } from "@/lib/normalize-upload";
import { detectMimeType } from "@/lib/file-signatures";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  SCAN_MAX_BYTES,
  canUploadInStatus,
} from "@/lib/uploads";
import type { ScanStatus } from "@/generated/prisma/client";
import { findRequirement, checklistProgress } from "@/lib/checklists";
import { parseAnswers } from "@/lib/wizard";
import { loadOwnedApplication } from "@/lib/actions/wizard";

export type UploadDocumentState = { error: string | null };

type OwnedApplication = NonNullable<
  Awaited<ReturnType<typeof loadOwnedApplication>>
>;

type UploadTarget =
  | { ok: true; application: OwnedApplication; requirementCode: string }
  | { ok: false; error: string };

/**
 * The authorisation gate, shared by BOTH upload entry points.
 *
 * Every one of these checks has to be repeated on the finalise step even
 * though the ticket step already ran them: the two are separate HTTP requests,
 * and nothing stops a caller from skipping the first one entirely or replaying
 * the second after the application's status has changed.
 */
async function resolveUploadTarget(formData: FormData): Promise<UploadTarget> {
  const application = await loadOwnedApplication(formData.get("applicationId"));
  if (!application) {
    return { ok: false, error: "Application not found." };
  }

  if (!canUploadInStatus(application.status)) {
    return {
      ok: false,
      error: "This application is not open for uploads right now.",
    };
  }

  const rawRequirementCode = formData.get("requirementCode");
  if (
    typeof rawRequirementCode !== "string" ||
    !findRequirement(application.category, rawRequirementCode)
  ) {
    return { ok: false, error: "Unknown document type." };
  }

  return { ok: true, application, requirementCode: rawRequirementCode };
}

/**
 * Step 1 of 2: hand the browser a one-time URL to PUT its file straight to R2.
 *
 * The file does NOT travel through this function — Vercel rejects any request
 * body over 4.5 MB at the edge, before the function is invoked, so large
 * documents cannot reach a Server Action at all. What this function does is
 * *authorise* the upload: it decides who may write, what the object is called,
 * and exactly how many bytes may be sent.
 *
 * The client's declared size is checked BEFORE signing and then bound into the
 * signature, so R2 itself rejects a body of any other length. A client cannot
 * talk its way past the limit by lying — the worst it can do is waste one
 * ticket's worth of quarantine space, which the bucket lifecycle rule expires.
 */
export type UploadTicketState = {
  error: string | null;
  ticket: { uploadUrl: string; quarantineKey: string } | null;
};

export async function createUploadTicket(
  _prev: UploadTicketState,
  formData: FormData,
): Promise<UploadTicketState> {
  const target = await resolveUploadTarget(formData);
  if (!target.ok) return { error: target.error, ticket: null };

  const size = Number(formData.get("size"));
  if (!Number.isInteger(size) || size <= 0) {
    return { error: "Choose a file to upload.", ticket: null };
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return {
      error: `File is too large — the limit is ${limitMb} MB.`,
      ticket: null,
    };
  }

  // The SERVER picks the key. If the client chose it, it could point at
  // another applicant's object and overwrite their passport.
  const quarantineKey = `${QUARANTINE_PREFIX}${target.application.id}/${randomUUID()}`;

  try {
    const uploadUrl = await getQuarantineUploadUrl(quarantineKey, size);
    return { error: null, ticket: { uploadUrl, quarantineKey } };
  } catch (error) {
    console.error("createUploadTicket: could not sign upload URL", error);
    return { error: "Could not start the upload. Please try again.", ticket: null };
  }
}

/**
 * Step 2 of 2: the browser reports its file has landed in quarantine; pull it
 * back, check it, and promote it to its permanent location.
 *
 * The quarantine object is deleted on every path out of here — success,
 * rejection, or crash — so an unscanned file never lingers.
 */
export async function finalizeUpload(
  _prev: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const target = await resolveUploadTarget(formData);
  if (!target.ok) return { error: target.error };

  const { application, requirementCode } = target;

  const quarantineKey = formData.get("quarantineKey");
  const rawFileName = formData.get("fileName");
  if (typeof quarantineKey !== "string" || typeof rawFileName !== "string") {
    return { error: "Invalid request." };
  }

  // THE critical check in this flow. Without it, any signed-in user could pass
  // someone else's quarantine key and have that person's document promoted
  // into their own application — reading a stranger's passport. Binding the
  // key to this application's id makes that impossible.
  if (!quarantineKey.startsWith(`${QUARANTINE_PREFIX}${application.id}/`)) {
    console.warn("[finalizeUpload] quarantine key did not match application", {
      applicationId: application.id,
      quarantineKey,
    });
    return { error: "Invalid request." };
  }

  const fileName = rawFileName.slice(0, 200);

  try {
    let bytes: Buffer;
    try {
      bytes = await getObjectBytes(quarantineKey);
    } catch (error) {
      console.error("finalizeUpload: could not read quarantined object", error);
      return { error: "The upload did not complete. Please try again." };
    }

    if (bytes.length === 0) {
      return { error: "Choose a file to upload." };
    }

    // Re-checked against the real object, not the client's earlier claim.
    if (bytes.length > MAX_FILE_SIZE_BYTES) {
      const limitMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
      return { error: `File is too large — the limit is ${limitMb} MB.` };
    }

    return await storeScannedDocument({
      application,
      requirementCode,
      fileName,
      bytes,
    });
  } finally {
    // Always. A quarantine object that survives its finalise is an unscanned
    // applicant document sitting in the bucket.
    await deleteObjectQuietly(quarantineKey);
  }
}

/**
 * The one and only upload pipeline: validate the bytes, normalise them, scan
 * them, store them, record them.
 *
 * Kept as a single function deliberately. Two copies of a security pipeline is
 * how one of them quietly loses a check.
 */
async function storeScannedDocument({
  application,
  requirementCode,
  fileName,
  bytes,
}: {
  application: OwnedApplication;
  requirementCode: string;
  fileName: string;
  bytes: Buffer;
}): Promise<UploadDocumentState> {

  // The REAL type, read from the leading bytes. `file.type` is a string the
  // client supplies and can set to anything, so trusting it meant a renamed
  // executable sent as `Content-Type: image/png` passed validation.
  const mimeType = detectMimeType(bytes);
  if (!mimeType) {
    return { error: "Only PDF, JPG, or PNG files are accepted." };
  }

  // There is no client-declared Content-Type to compare against any more: the
  // file arrives from R2, not from a form field, so the magic bytes above are
  // the only statement about its type — which is exactly the control we want.

  // Upload pipeline order (docs/roadmap.md), now with a normalise step:
  //   validate → normalize → scan → store
  // Normalising persists nothing, so the rule that nothing unscanned reaches
  // R2 is unchanged. Re-encoding an image strips anything that isn't pixels,
  // and shrinks a phone photo from megabytes to a few hundred KB — which is
  // what brings it under the scanner's size limit so it CAN be scanned.
  const normalized = await normalizeUpload(bytes, mimeType);
  if (!normalized.ok) {
    return {
      error: "This image could not be read. Please try a different file.",
    };
  }
  const storedBytes = normalized.bytes;
  // NOT `mimeType` — normalisation converts a photographic PNG to JPEG, since
  // PNG is lossless and such a file would otherwise stay too large to scan.
  // Everything downstream (extension, ContentType, the Document row) must
  // describe what we actually stored.
  const storedMimeType = normalized.mimeType;

  let scanStatus: ScanStatus;

  if (storedBytes.length > SCAN_MAX_BYTES) {
    // Cloudmersive's free tier refuses this outright, so calling it would
    // just produce a guaranteed 400. Recorded honestly as SKIPPED rather
    // than quietly stored as if it had been checked. In practice only large
    // PDFs land here — images are always re-encoded well under the limit.
    console.warn("[uploadDocument] file too large to scan, storing SKIPPED", {
      applicationId: application.id,
      requirementCode,
      bytes: storedBytes.length,
      limit: SCAN_MAX_BYTES,
    });
    scanStatus = "SKIPPED";
  } else {
    const scan = await scanFileForViruses(storedBytes, fileName);

    if (scan.status === "infected") {
      console.warn("[uploadDocument] infected file rejected", {
        applicationId: application.id,
        requirementCode,
        viruses: scan.viruses,
      });
      return {
        error: "This file did not pass our security scan and was not uploaded.",
      };
    }

    if (scan.status === "error") {
      // A file we chose to scan but couldn't is NOT stored. Only the
      // known, deliberate too-large case above is allowed through unscanned;
      // an unexplained scanner failure is not.
      return {
        error: scan.retryable
          ? "Our security scan is temporarily unavailable. Please try again in a few minutes."
          : "This file could not be security-checked and was not uploaded. Please contact us if this continues.",
      };
    }

    scanStatus = "CLEAN";
  }

  // Extension comes from the DETECTED mime type, never from the client's
  // filename or its claimed Content-Type — a renamed executable does not get
  // to keep a .pdf extension.
  const extension = ALLOWED_MIME_TYPES[storedMimeType];
  const storageKey = `applications/${application.id}/${requirementCode}/${randomUUID()}.${extension}`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        // The NORMALISED bytes — the ones that were scanned. Storing the
        // originals here would mean serving admins a file nothing checked.
        Body: storedBytes,
        ContentType: storedMimeType,
      }),
    );
  } catch (error) {
    console.error("uploadDocument: R2 put failed", error);
    return { error: "Could not store the file. Please try again." };
  }

  // Look up any existing upload for this requirement BEFORE the upsert, so we
  // know which R2 object to delete once the new one is safely recorded.
  const previous = await prisma.document.findUnique({
    where: {
      applicationId_requirementCode: {
        applicationId: application.id,
        requirementCode,
      },
    },
    select: { storageKey: true },
  });

  try {
    await prisma.document.upsert({
      where: {
        applicationId_requirementCode: {
          applicationId: application.id,
          requirementCode,
        },
      },
      create: {
        applicationId: application.id,
        requirementCode,
        fileName,
        storageKey,
        mimeType: storedMimeType,
        // Size of what was actually stored, not what was uploaded — after
        // re-encoding these differ by an order of magnitude, and this column
        // is what R2 storage accounting is read from.
        sizeBytes: storedBytes.length,
        scanStatus,
        reviewStatus: "PENDING",
      },
      update: {
        fileName,
        storageKey,
        mimeType: storedMimeType,
        sizeBytes: storedBytes.length,
        scanStatus,
        // A replacement is a new file — any note or decision on the old one
        // no longer applies to what the admin is about to see.
        reviewStatus: "PENDING",
        adminNote: null,
        version: { increment: 1 },
      },
    });
  } catch (error) {
    console.error("uploadDocument: db upsert failed", error);
    // The object already landed in R2 but the row didn't save — remove it so
    // storage never holds a file no Document row points to.
    await r2
      .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }))
      .catch(() => {});
    return { error: "Could not save the upload. Please try again." };
  }

  // Only now, after the new row is committed, remove the superseded object —
  // GDPR data minimisation (don't keep a file nothing points to), not started
  // until the replacement is confirmed safe.
  if (previous && previous.storageKey !== storageKey) {
    await r2
      .send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: previous.storageKey,
        }),
      )
      .catch((error) => {
        console.error(
          "uploadDocument: failed to delete superseded object",
          error,
        );
      });
  }

  revalidatePath(`/applications/${application.id}`);

  return { error: null };
}

export type DeleteDocumentState = { error: string | null };

export async function deleteDocument(
  _prev: DeleteDocumentState,
  formData: FormData,
): Promise<DeleteDocumentState> {
  const application = await loadOwnedApplication(formData.get("applicationId"));
  if (!application) {
    return { error: "Application not found." };
  }

  // Same statuses as upload/replace — a document mid-review or already
  // accepted can't be pulled out from under the admin looking at it.
  if (!canUploadInStatus(application.status)) {
    return { error: "This application is not open for changes right now." };
  }

  const rawRequirementCode = formData.get("requirementCode");
  if (typeof rawRequirementCode !== "string") {
    return { error: "Unknown document type." };
  }
  const requirementCode = rawRequirementCode;

  const document = await prisma.document.findUnique({
    where: {
      applicationId_requirementCode: {
        applicationId: application.id,
        requirementCode,
      },
    },
    select: { storageKey: true },
  });

  // Nothing to delete is not an error — same end state either way.
  if (!document) {
    return { error: null };
  }

  try {
    await prisma.document.delete({
      where: {
        applicationId_requirementCode: {
          applicationId: application.id,
          requirementCode,
        },
      },
    });
  } catch (error) {
    console.error("deleteDocument: db delete failed", error);
    return { error: "Could not remove the file. Please try again." };
  }

  // The Document row is the source of truth for "is this uploaded" — delete
  // it first, then best-effort clean up R2. If the object delete fails, the
  // checklist is still correct; storage just holds an orphan until retried,
  // same trade-off as the superseded-object cleanup in uploadDocument above.
  await r2
    .send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: document.storageKey }),
    )
    .catch((error) => {
      console.error("deleteDocument: failed to delete R2 object", error);
    });

  revalidatePath(`/applications/${application.id}`);

  return { error: null };
}

export type SubmitApplicationState = { error: string | null };

export async function submitApplication(
  _prev: SubmitApplicationState,
  formData: FormData,
): Promise<SubmitApplicationState> {
  const application = await loadOwnedApplication(formData.get("applicationId"));
  if (!application) {
    return { error: "Application not found." };
  }

  // Same statuses as upload/replace/delete (canUploadInStatus): DRAFT is the
  // first submission, REJECTED/NEEDS_REVISION is a resubmission after the
  // applicant has acted on admin feedback. PENDING_REVIEW and APPROVED are
  // not resubmittable — one is already in the queue, the other is done.
  if (!canUploadInStatus(application.status)) {
    return { error: "This application has already been submitted." };
  }

  // loadOwnedApplication doesn't select documents (the wizard steps never
  // need them) — fetch just the codes needed for the progress check.
  const documents = await prisma.document.findMany({
    where: { applicationId: application.id },
    select: { requirementCode: true },
  });

  const answers = parseAnswers(application.data);
  const progress = checklistProgress(
    application.category,
    answers,
    documents.map((d) => d.requirementCode),
  );

  if (!progress.canSubmit) {
    return {
      error: `Upload every required document before submitting (${progress.uploaded} of ${progress.total} so far).`,
    };
  }

  // Enforced here, not just by the checkbox's `required` attribute. A form can
  // be submitted without ever rendering that checkbox, and the whole point of
  // the declaration is that there is a RECORD of it — a record the client
  // could opt out of writing would be worthless.
  if (formData.get("privacyAccepted") !== "on") {
    return {
      error: "Please confirm the declaration before submitting.",
    };
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      privacyAcceptedAt: new Date(),
    },
  });

  revalidatePath(`/applications/${application.id}`);
  revalidatePath("/dashboard");

  return { error: null };
}
