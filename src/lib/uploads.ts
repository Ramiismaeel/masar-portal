/**
 * Server-side upload policy — the real control. The <input accept> attribute
 * on the client is a UX convenience only; a request can set any Content-Type
 * it likes, so every value here is re-checked in the upload Server Action.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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
