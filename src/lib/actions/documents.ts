"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET } from "@/lib/r2";
import { scanFileForViruses } from "@/lib/virus-scan";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  canUploadInStatus,
  isAllowedMimeType,
} from "@/lib/uploads";
import { findRequirement, checklistProgress } from "@/lib/checklists";
import { parseAnswers } from "@/lib/wizard";
import { loadOwnedApplication } from "@/lib/actions/wizard";

export type UploadDocumentState = { error: string | null };

export async function uploadDocument(
  _prev: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const application = await loadOwnedApplication(formData.get("applicationId"));
  if (!application) {
    return { error: "Application not found." };
  }

  if (!canUploadInStatus(application.status)) {
    return { error: "This application is not open for uploads right now." };
  }

  const rawRequirementCode = formData.get("requirementCode");
  if (
    typeof rawRequirementCode !== "string" ||
    !findRequirement(application.category, rawRequirementCode)
  ) {
    return { error: "Unknown document type." };
  }
  const requirementCode = rawRequirementCode;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "File is too large — the limit is 10 MB." };
  }

  if (!isAllowedMimeType(file.type)) {
    return { error: "Only PDF, JPG, or PNG files are accepted." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Upload pipeline order (docs/roadmap.md): validate → scan → store. Nothing
  // below this point runs unless the scan comes back clean.
  const scan = await scanFileForViruses(bytes, file.name);

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
    return { error: "Could not scan the file right now. Please try again shortly." };
  }

  // Extension comes from the validated mime type, never from the client's
  // filename — a renamed executable does not get to keep a .pdf extension.
  const extension = ALLOWED_MIME_TYPES[file.type];
  const storageKey = `applications/${application.id}/${requirementCode}/${randomUUID()}.${extension}`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: bytes,
        ContentType: file.type,
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
        fileName: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        scanStatus: "CLEAN",
        reviewStatus: "PENDING",
      },
      update: {
        fileName: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        scanStatus: "CLEAN",
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
      .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: previous.storageKey }))
      .catch((error) => {
        console.error("uploadDocument: failed to delete superseded object", error);
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
    .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: document.storageKey }))
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

  if (application.status !== "DRAFT") {
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

  await prisma.application.update({
    where: { id: application.id },
    data: { status: "PENDING_REVIEW", submittedAt: new Date() },
  });

  revalidatePath(`/applications/${application.id}`);
  revalidatePath("/dashboard");

  return { error: null };
}
