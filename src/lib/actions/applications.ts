"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET } from "@/lib/r2";
import { isCategoryValue } from "@/lib/categories";
import type { VisaCategory } from "@/generated/prisma/client";

export type CreateApplicationState = { error: string | null };

/**
 * Structural check for a Prisma error code, rather than
 * `instanceof Prisma.PrismaClientKnownRequestError`.
 *
 * Two reasons: the new `prisma-client` generator moves that class around
 * between versions, and `instanceof` breaks anyway if two copies of the runtime
 * end up in the bundle. The wire format — an object with a `code` string — is
 * the stable part.
 */
function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * Creates a DRAFT application for the signed-in user and sends them to the wizard.
 *
 * Every guard here is mirrored in the UI for a nice experience, but the UI
 * copies are decoration. These are the real controls: a Server Action is a
 * public HTTP endpoint, and anyone can POST to it with any body.
 */
export async function createApplication(
  _prevState: CreateApplicationState,
  formData: FormData,
): Promise<CreateApplicationState> {
  // 1. Who is this? Never read a user id from the form — only from the session.
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { error: "You need to be signed in to start an application." };
  }

  // 2. The email-verification gate (roadmap decision: verification does not
  //    block login, but it does block creating an application).
  if (!session.user.emailVerified) {
    return {
      error:
        "Please confirm your email address first. Check your inbox, or use the resend button on your dashboard.",
    };
  }

  // 3. Validate untrusted input against our own list. Do not cast a raw string
  //    to the Prisma enum and hope — an unknown value would reach the database.
  const rawCategory = formData.get("category");

  if (typeof rawCategory !== "string" || !isCategoryValue(rawCategory)) {
    return { error: "Please choose a valid category." };
  }

  const category = rawCategory as VisaCategory;
  const userId = session.user.id;

  let applicationId: string;

  try {
    const application = await prisma.application.create({
      data: {
        userId,
        category,
        // status defaults to DRAFT and currentStep defaults to 0 in the schema —
        // let the database own its own defaults rather than restating them here.
      },
      select: { id: true },
    });

    applicationId = application.id;
  } catch (error) {
    // P2002 = unique constraint violated, i.e. this user already has an
    // application in this category. Not a failure worth showing — send them to
    // the one they already have.
    if (isPrismaErrorCode(error, "P2002")) {
      const existing = await prisma.application.findUnique({
        where: { userId_category: { userId, category } },
        select: { id: true },
      });

      if (existing) {
        redirect(`/applications/${existing.id}/wizard`);
      }
    }

    console.error("createApplication failed", error);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard");

  // redirect() signals by throwing, so it must sit OUTSIDE the try/catch above —
  // inside, our own catch block would swallow it and the redirect would vanish.
  redirect(`/applications/${applicationId}/wizard`);
}

export type DeleteApplicationState = { error: string | null };

/**
 * Permanently deletes a DRAFT application and everything under it.
 *
 * Once submitted, the roadmap's edit-gating rule takes over (only
 * REJECTED/NEEDS_REVISION allow changes) — deletion follows the same logic
 * one step further: PENDING_REVIEW and beyond can't be deleted at all, since
 * an admin may already be looking at it, or it may already be decided.
 */
export async function deleteApplication(
  _prev: DeleteApplicationState,
  formData: FormData,
): Promise<DeleteApplicationState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: "You need to be signed in." };
  }

  const rawId = formData.get("applicationId");
  if (typeof rawId !== "string") {
    return { error: "Application not found." };
  }

  // Scoped by BOTH id and userId — same IDOR guard as everywhere else.
  const application = await prisma.application.findFirst({
    where: { id: rawId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      documents: { select: { storageKey: true } },
    },
  });

  if (!application) {
    return { error: "Application not found." };
  }

  if (application.status !== "DRAFT") {
    return { error: "Submitted applications can no longer be deleted." };
  }

  const storageKeys = application.documents.map((d) => d.storageKey);

  try {
    // onDelete: Cascade removes the Document rows in the same statement —
    // the database is the source of truth here, deleted atomically.
    await prisma.application.delete({ where: { id: application.id } });
  } catch (error) {
    console.error("deleteApplication: db delete failed", error);
    return { error: "Could not delete the application. Please try again." };
  }

  // Best-effort R2 cleanup, same trade-off as document deletion: the
  // database is already correct even if an object delete fails here.
  await Promise.all(
    storageKeys.map((key) =>
      r2
        .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
        .catch((error) => {
          console.error("deleteApplication: failed to delete R2 object", error);
        }),
    ),
  );

  revalidatePath("/dashboard");

  redirect("/dashboard");
}
