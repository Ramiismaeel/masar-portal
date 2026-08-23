/**
 * Turns an accepted upload into the bytes that will actually be scanned and
 * stored. SERVER ONLY — imports sharp (a native module). A "use client" file
 * must never import this.
 *
 * Runs between validation and the virus scan, so the pipeline order from
 * docs/roadmap.md becomes:
 *
 *     validate  ->  normalize  ->  scan  ->  store
 *
 * Nothing here persists anything, so the rule that nothing unscanned reaches
 * R2 is untouched.
 *
 * Two jobs, both of which matter more than they look:
 *
 * 1. SAFETY. Re-encoding an image keeps the pixels and throws away literally
 *    everything else — appended archives, polyglot files, script payloads
 *    hidden in metadata. For images this is a stronger control than
 *    signature-based antivirus, because it doesn't depend on the payload
 *    being a *known* threat.
 *
 * 2. SCAN COVERAGE. Cloudmersive's free tier refuses files over ~3.5 MB
 *    (measured; they document 3 MB). A 6 MB phone photo therefore could not
 *    be scanned at all. Re-encoded at MAX_IMAGE_DIMENSION it lands in the
 *    hundreds of KB, so it now gets scanned normally. Shrinking the file is
 *    what BUYS the antivirus coverage back, rather than working around it.
 *
 * PDFs pass through untouched — re-encoding one safely needs a full parser,
 * which is a much larger dependency and its own attack surface. A PDF that
 * is still too big after this is the only thing that ends up unscanned.
 */

import sharp from "sharp";

import {
  MAX_IMAGE_DIMENSION,
  SCAN_MAX_BYTES,
  type AllowedMimeType,
} from "./uploads";

/** Re-encode quality for JPEG output. 82 is visually clean for document photos. */
const JPEG_QUALITY = 82;

export type NormalizeResult =
  | {
      ok: true;
      bytes: Buffer;
      /**
       * The type of the RETURNED bytes, which is not always the type that
       * came in — a photographic PNG is converted to JPEG (see below). The
       * caller must use this for the stored extension, the R2 ContentType
       * and the Document row, never the type it passed in.
       */
      mimeType: AllowedMimeType;
    }
  /** The bytes claimed to be an image but could not be decoded. */
  | { ok: false; reason: "unreadable-image" };

export async function normalizeUpload(
  bytes: Buffer,
  mimeType: AllowedMimeType,
): Promise<NormalizeResult> {
  if (mimeType === "application/pdf") {
    return { ok: true, bytes, mimeType };
  }

  // Rebuilt per attempt rather than shared: a sharp pipeline is consumed by
  // toBuffer(), so the PNG and JPEG encodes below each need their own.
  const pipeline = () =>
    sharp(bytes, {
      // sharp's default pixel ceiling (~268 megapixels) already refuses
      // decompression bombs — a small file that decodes to gigabytes of
      // raw pixels. Left at the default deliberately; it is the guard.
      failOn: "error",
    })
      // No argument: applies the EXIF orientation flag, then DROPS the EXIF
      // block. Two wins — photos stop appearing sideways, and we stop
      // storing the GPS coordinates phones write into a passport photo.
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        // Never upscale: a small scan should stay small, not be inflated
        // into a bigger file for nothing.
        withoutEnlargement: true,
      });

  try {
    if (mimeType === "image/jpeg") {
      return {
        ok: true,
        bytes: await pipeline().jpeg({ quality: JPEG_QUALITY }).toBuffer(),
        mimeType,
      };
    }

    // PNG is LOSSLESS, so the output format has to be chosen by result rather
    // than by input format. Measured on representative content at 2400px:
    //
    //   photographic image   as PNG 7231 KB  |  as JPEG  853 KB
    //   document scan (text) as PNG   93 KB  |  as JPEG  732 KB
    //
    // Neither format wins outright. Keeping PNG unconditionally — the first
    // version of this file — meant a photo saved as PNG stayed over
    // SCAN_MAX_BYTES and was therefore never virus-scanned. Converting
    // unconditionally would bloat crisp text scans ~8x and visibly blur them.
    const asPng = await pipeline().png({ compressionLevel: 9 }).toBuffer();

    if (asPng.length <= SCAN_MAX_BYTES) {
      // Small enough to scan, so keep the lossless original format. This is
      // the screenshot / line-art / text-scan case, where PNG is genuinely
      // both smaller AND sharper.
      return { ok: true, bytes: asPng, mimeType: "image/png" };
    }

    // Too big to scan as PNG — that means photographic content, which is
    // exactly what JPEG is for. `flatten` composites any transparency onto
    // white first; without it transparent regions become BLACK, which on a
    // scanned document would obliterate the page.
    const asJpeg = await pipeline()
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    // Guard against the pathological case where JPEG somehow lost: better a
    // large PNG than a large PNG re-encoded badly.
    return asJpeg.length < asPng.length
      ? { ok: true, bytes: asJpeg, mimeType: "image/jpeg" }
      : { ok: true, bytes: asPng, mimeType: "image/png" };
  } catch (error) {
    // Reaching here means the magic bytes said "image" but the decoder
    // disagreed — a truncated file, or something wearing a PNG header.
    // That is a validation outcome, not a server fault.
    console.error("[normalize-upload] could not decode image:", error);
    return { ok: false, reason: "unreadable-image" };
  }
}
