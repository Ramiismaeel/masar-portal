import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin";
import { getDocumentDownloadUrl } from "@/lib/r2";
import { recordAudit } from "@/lib/audit";

/**
 * The only way an admin reaches an uploaded file.
 *
 * Replaces linking straight to a presigned URL from the review page, which
 * had two problems: nothing recorded WHO opened someone's passport (the
 * central question an audit trail exists to answer), and the page minted a
 * live 10-minute URL for every document on every render — including the ones
 * nobody opened. Now a URL is minted only when a file is actually requested,
 * and that request is logged first.
 *
 * `requireAdminSession` is re-checked here rather than relied on from the
 * admin layout: a route handler is its own public HTTP endpoint, exactly like
 * a Server Action. Same rule as everywhere else in this app.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;

  const session = await requireAdminSession();
  if (!session) {
    // 404, not 403 — a non-admin should not learn that this id exists.
    return new NextResponse("Not found", { status: 404 });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      storageKey: true,
      fileName: true,
      requirementCode: true,
      application: { select: { id: true, userId: true } },
    },
  });

  if (!document) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Logged BEFORE the URL is handed out, so a crash between the two can only
  // ever over-record access, never silently under-record it.
  await recordAudit({
    action: "DOCUMENT_DOWNLOADED",
    actorUserId: session.user.id,
    subjectUserId: document.application.userId,
    targetType: "document",
    targetId: document.id,
    metadata: {
      requirementCode: document.requirementCode,
      applicationId: document.application.id,
    },
  });

  const url = await getDocumentDownloadUrl(document.storageKey);
  return NextResponse.redirect(url);
}
