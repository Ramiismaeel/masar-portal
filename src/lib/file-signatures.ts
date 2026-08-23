/**
 * Detects a file's REAL type from its leading bytes.
 *
 * This exists because `File.type` is a client-supplied string. The browser
 * fills it in from the file extension, and a request made with curl can put
 * anything there — so `isAllowedMimeType(file.type)` alone accepts a renamed
 * executable sent as `Content-Type: image/png`. The bytes cannot be renamed.
 *
 * Deliberately dependency-free and free of any Node built-in, so the SAME
 * check runs in the browser (fail fast, before an 8 MB upload) and on the
 * server (the one that actually counts). Takes Uint8Array rather than Buffer
 * for the same reason — Buffer is a Uint8Array, so the server can pass one
 * straight in.
 */

import { type AllowedMimeType } from "./uploads";

type Signature = {
  mimeType: AllowedMimeType;
  /** Bytes that must appear at offset 0. */
  bytes: readonly number[];
};

const SIGNATURES: readonly Signature[] = [
  // "%PDF-". The PDF spec technically tolerates junk before this marker, but
  // requiring it at offset 0 is the stricter reading and costs us nothing:
  // anything a scanner or phone produces puts it first.
  { mimeType: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  // JPEG SOI + first marker byte. Only three bytes are stable — the fourth
  // varies by encoder (0xE0 JFIF, 0xE1 EXIF, 0xDB, 0xEE …), so matching it
  // would reject valid photos.
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // PNG's 8-byte signature. The 0x0d 0x0a 0x1a 0x0a tail is a deliberate
  // corruption canary in the format itself, so all 8 bytes are worth matching.
  {
    mimeType: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
];

/** Longest signature — how many bytes a caller needs to read to decide. */
export const SIGNATURE_PROBE_BYTES = 8;

/**
 * Returns the type the bytes actually are, or null for anything not on the
 * allow-list. Null means reject: this is an allow-list, so an unrecognised
 * file is not "unknown, probably fine" — it is not one of the three formats
 * this portal accepts.
 */
export function detectMimeType(bytes: Uint8Array): AllowedMimeType | null {
  for (const signature of SIGNATURES) {
    if (bytes.length < signature.bytes.length) continue;

    let matches = true;
    for (let i = 0; i < signature.bytes.length; i++) {
      if (bytes[i] !== signature.bytes[i]) {
        matches = false;
        break;
      }
    }

    if (matches) return signature.mimeType;
  }

  return null;
}
