import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Zip, ZipPassThrough } from "fflate";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin";
import { r2, R2_BUCKET } from "@/lib/r2";
import { recordAudit } from "@/lib/audit";
import { findCategory, isCategoryValue } from "@/lib/categories";

/**
 * Strips a client-supplied filename down to something safe to write into a
 * ZIP entry. `fileName` is whatever the applicant's device called the file,
 * so it is untrusted: a name like `../../secrets.pdf` would otherwise become
 * a zip-slip payload for whoever extracts the archive. Path separators, `..`
 * and control characters all go; the extension is preserved.
 */
function safeEntryName(fileName: string): string {
  const cleaned = fileName
    .replace(/[\\/]/g, "_")
    // C0 control characters and DEL, written as escape sequences rather
    // than literal characters so this class cannot be silently mangled
    // into a different (and far more destructive) one by an edit.
    .replace(/[\u0000-\u001F\u007F]/g, "")
    // Collapse dot runs so ".." can never survive as path traversal.
    .replace(/\.{2,}/g, ".")
    // A leading dot would extract as a hidden file.
    .replace(/^\.+/, "")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "document";
}

/**
 * Admin-only: download every uploaded document for one application as a
 * single ZIP, for forwarding to the embassy.
 *
 * This is an OPERATIONAL tool, not GDPR data portability (Art. 20) — Rami's
 * explicit call. Portability would be applicant-facing and would include
 * their structured data; this is staff-facing and contains the files.
 *
 * Streams rather than building the whole archive in memory: documents are
 * capped at 10 MB each and a Medical application carries 13 of them, so the
 * all-at-once version could hit ~130 MB on a serverless function. Files are
 * pulled one at a time and pushed into the archive as they arrive, so peak
 * memory is roughly one document rather than all of them.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await requireAdminSession();
  if (!session) {
    // 404 rather than 403 — don't confirm the id exists to a non-admin.
    return new Response("Not found", { status: 404 });
  }

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      category: true,
      status: true,
      fullNameLatin: true,
      passportNumber: true,
      submittedAt: true,
      user: { select: { name: true, email: true, phone: true } },
      documents: {
        select: {
          id: true,
          requirementCode: true,
          fileName: true,
          storageKey: true,
        },
      },
    },
  });

  if (!application) {
    return new Response("Not found", { status: 404 });
  }

  if (application.documents.length === 0) {
    return new Response("This application has no uploaded documents.", {
      status: 404,
    });
  }

  // PRE-FLIGHT: confirm every object actually exists in R2 before a single
  // byte of the response is sent.
  //
  // Found live, not anticipated: without this, a missing object throws from
  // inside the stream — AFTER the 200 and the zip Content-Type have already
  // gone out. The browser has begun a download by then, so it cannot show an
  // error page; it just aborts with a generic network failure ("check your
  // internet connection"), which tells the admin nothing about the real
  // problem. Checking up front means the failure arrives as a readable
  // message instead.
  //
  // Failing the whole export is deliberate rather than skipping the missing
  // files. A gap here means genuine data loss (see the bucket-rename note in
  // docs/roadmap.md), and an archive quietly missing a passport could be
  // forwarded to an embassy as if complete. Better to refuse and name what is
  // missing so someone asks the applicant to re-upload.
  const presence = await Promise.all(
    application.documents.map(async (d) => {
      try {
        await r2.send(
          new HeadObjectCommand({ Bucket: R2_BUCKET, Key: d.storageKey }),
        );
        return null;
      } catch {
        return d.requirementCode;
      }
    }),
  );
  const missing = presence.filter((code): code is string => code !== null);

  if (missing.length > 0) {
    console.error(
      `export blocked for application ${application.id}: ${missing.length} of ${application.documents.length} objects missing from R2 —`,
      missing.join(", "),
    );
    return new Response(
      [
        `Cannot export this application.`,
        ``,
        `${missing.length} of ${application.documents.length} uploaded files are missing from storage:`,
        ...missing.map((code) => `  - ${code}`),
        ``,
        `The database still lists these documents, but the files themselves are`,
        `not in the storage bucket, so the export would be incomplete.`,
        `Ask the applicant to upload them again.`,
      ].join("\n"),
      { status: 409, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // Logged only once the export is actually going to happen — a blocked
  // pre-flight granted no access to anything.
  await recordAudit({
    action: "APPLICATION_EXPORTED",
    actorUserId: session.user.id,
    subjectUserId: application.userId,
    targetType: "application",
    targetId: application.id,
    metadata: {
      documentCount: application.documents.length,
      category: application.category,
    },
  });

  const categoryLabel = isCategoryValue(application.category)
    ? (findCategory(application.category)?.labelEn ?? application.category)
    : application.category;

  // A plain-text manifest so the archive is self-describing once it has been
  // emailed on and separated from the portal.
  const manifest = [
    `Masar Portal — application export`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `Applicant:       ${application.user.name}`,
    `Email:           ${application.user.email}`,
    `Phone:           ${application.user.phone ?? "—"}`,
    `Name (passport): ${application.fullNameLatin ?? "—"}`,
    `Passport number: ${application.passportNumber ?? "—"}`,
    ``,
    `Category:        ${categoryLabel}`,
    `Status:          ${application.status}`,
    `Submitted:       ${application.submittedAt?.toISOString() ?? "not submitted"}`,
    `Application ID:  ${application.id}`,
    ``,
    `Documents (${application.documents.length}):`,
    ...application.documents.map(
      (d) => `  - ${d.requirementCode}: ${d.fileName}`,
    ),
    ``,
  ].join("\n");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) {
          controller.error(err);
          return;
        }
        if (chunk) controller.enqueue(chunk);
        if (final) controller.close();
      });

      void (async () => {
        try {
          const manifestEntry = new ZipPassThrough("manifest.txt");
          zip.add(manifestEntry);
          manifestEntry.push(new TextEncoder().encode(manifest), true);

          // Prefixed with the requirement code so the embassy-facing archive
          // is ordered and self-explanatory, and so two files that happen to
          // share a device filename don't collide.
          const usedNames = new Set<string>(["manifest.txt"]);

          for (const document of application.documents) {
            let name = `${document.requirementCode}__${safeEntryName(document.fileName)}`;
            let suffix = 2;
            while (usedNames.has(name)) {
              name = `${document.requirementCode}__${suffix}__${safeEntryName(document.fileName)}`;
              suffix += 1;
            }
            usedNames.add(name);

            const object = await r2.send(
              new GetObjectCommand({
                Bucket: R2_BUCKET,
                Key: document.storageKey,
              }),
            );

            if (!object.Body) continue;
            const bytes = await object.Body.transformToByteArray();

            // ZipPassThrough = stored, not deflated. These are already-
            // compressed JPEGs and PDFs; deflating them burns CPU for
            // roughly nothing.
            const entry = new ZipPassThrough(name);
            zip.add(entry);
            entry.push(bytes, true);
          }

          zip.end();
        } catch (error) {
          console.error("application export failed", error);
          controller.error(error);
        }
      })();
    },
  });

  const fileNameBase = safeEntryName(
    `masar-${categoryLabel}-${application.fullNameLatin ?? application.id}`,
  ).replace(/\s+/g, "-");

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileNameBase}.zip"`,
      // Nothing about this response is cacheable — it is personal data behind
      // an authorisation check.
      "Cache-Control": "no-store, private",
    },
  });
}
