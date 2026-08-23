/**
 * Server-side upload policy — the real control. The <input accept> attribute
 * on the client is a UX convenience only; a request can set any Content-Type
 * it likes, so every value here is re-checked in the upload Server Action.
 */

/**
 * Largest file a user may CHOOSE. Images are shrunk in the browser before
 * being sent, so a 10 MB photo is fine — what actually travels is a few
 * hundred KB. This is the input limit, not the transport limit; see
 * MAX_UPLOAD_REQUEST_BYTES below for the one that constrains the network.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Largest file that can actually be SENT to a Server Action on Vercel.
 *
 * Vercel rejects any function request body over **4.5 MB** at the edge with
 * 413 `FUNCTION_PAYLOAD_TOO_LARGE`, before the request reaches our code. It is
 * documented as a hard platform limit and is NOT configurable —
 * `serverActions.bodySizeLimit` in next.config.ts cannot raise it, because
 * that setting is enforced inside the function that never gets invoked.
 *
 * This does not reproduce locally: `next dev` has no such cap, which is why a
 * 5.5 MB PDF uploaded fine on localhost and failed on preview.
 *
 * 4 MB, not 4.5, leaves room for multipart/form-data boundaries and the other
 * fields in the request. Enforced CLIENT-side, because the point is to fail
 * with a clear message instead of letting the platform return an error page
 * the app cannot catch or explain.
 *
 * Raising this requires uploading directly to R2 with a presigned URL and
 * bypassing the function entirely — see docs/roadmap.md.
 */
export const MAX_UPLOAD_REQUEST_BYTES = 4 * 1024 * 1024;

/**
 * Largest file the virus scanner will accept, in bytes.
 *
 * Cloudmersive's free tier refuses anything bigger with a 400 and the message
 * "Paid plan required: Input file was larger than the limit for the free tier
 * (3 MB)". Measured by binary search, the enforced cliff is actually
 * 3,500,000 bytes — but that extra slack is undocumented and they could
 * remove it without notice, so we hold to the documented 3 MB.
 *
 * Env-driven so that upgrading the Cloudmersive plan is a Vercel environment
 * change and nothing else: raise VIRUS_SCAN_MAX_BYTES and files stop being
 * skipped. No code change, no redeploy of logic.
 *
 * NOTE: only the SERVER sees this value. Next.js inlines just NEXT_PUBLIC_*
 * variables into the client bundle, so shrink-image.ts always sees the 3 MB
 * default. That is harmless — the browser helper is a UX optimisation and the
 * server is the authority — but it does mean raising the limit will not, on
 * its own, stop the browser converting large PNGs to JPEG.
 */
const DEFAULT_SCAN_MAX_BYTES = 3 * 1024 * 1024;

/**
 * Parsed defensively rather than with a bare Number(). A malformed value —
 * "10MB", "10 mb", a stray space — yields NaN, and `size > NaN` is ALWAYS
 * false, meaning nothing would ever be skipped and every oversized file would
 * be sent to a scanner guaranteed to reject it. That is precisely the
 * original bug, reintroduced by a typo in an environment variable. Falling
 * back to the safe default is the only sane failure mode.
 */
function parseScanMaxBytes(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_SCAN_MAX_BYTES;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[uploads] VIRUS_SCAN_MAX_BYTES is not a positive number (${JSON.stringify(raw)}) — falling back to ${DEFAULT_SCAN_MAX_BYTES} bytes.`,
    );
    return DEFAULT_SCAN_MAX_BYTES;
  }

  return parsed;
}

export const SCAN_MAX_BYTES = parseScanMaxBytes(
  process.env.VIRUS_SCAN_MAX_BYTES,
);

/**
 * Long-edge cap in pixels for re-encoded images. Lives here, not in
 * normalize-upload.ts, because the browser-side shrink helper needs the same
 * number and must not import sharp. One constant, two consumers — the "10 MB"
 * string duplicated into an error message is exactly the drift this avoids.
 *
 * This is the number to reason about if an admin says a document is hard to
 * read: a passport page at 2400px is comfortably legible for checking a name
 * and number, while keeping output far under SCAN_MAX_BYTES. Raising it
 * trades scan coverage for detail.
 */
export const MAX_IMAGE_DIMENSION = 2400;

/**
 * Every document in the checklist is a scan or photo of a physical paper —
 * passport, certificate, licence. PDF covers a scanned multi-page document;
 * JPEG/PNG cover a phone photo, which is how most applicants will actually
 * produce these.
 *
 * The extension is derived from this map, never from the client-supplied
 * filename — a renamed .exe with a .pdf extension must not be trusted.
 */
export const ALLOWED_MIME_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES;

export function isAllowedMimeType(type: string): type is AllowedMimeType {
  return Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, type);
}

/**
 * Statuses in which a document may be uploaded or replaced.
 *
 * DRAFT covers the first-time upload, before submission. REJECTED and
 * NEEDS_REVISION cover a re-upload after admin feedback (roadmap security
 * rule: "edit an application or replace a document only when its status is
 * REJECTED or NEEDS_REVISION" — DRAFT is the earlier case that rule doesn't
 * mention because nothing has been submitted yet to reject).
 * PENDING_REVIEW and APPROVED are deliberately excluded — a file mid-review
 * or already accepted is not swappable out from under the admin looking at
 * it.
 *
 * Lives here (not in the "use server" actions file) so both the Server
 * Action and the checklist page — which needs it to decide whether to render
 * upload controls at all — can import it. A "use server" module may only
 * export async functions.
 */
export function canUploadInStatus(status: string): boolean {
  return status === "DRAFT" || status === "REJECTED" || status === "NEEDS_REVISION";
}
