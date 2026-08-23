/**
 * Shrinks an image IN THE BROWSER, before it is uploaded.
 *
 * BROWSER ONLY — uses canvas and createImageBitmap. Safe to import from a
 * "use client" file; it pulls in no server code and no dependencies.
 *
 * This is NOT a security control, and it is not a virus scan. Anyone can post
 * straight to the Server Action and skip this entirely, which is why
 * normalize-upload.ts repeats the same work server-side and trusts nothing
 * that happens here. What this buys is:
 *
 * 1. SPEED, which is the real point. A 6 MB phone photo becomes a few hundred
 *    KB before it leaves the device — a ~12x smaller upload. On the mobile
 *    connections most applicants are on, that is the difference between an
 *    upload that works and one that times out.
 *
 * 2. PRIVACY. Re-drawing through a canvas keeps only pixels, so EXIF — and
 *    with it the GPS coordinates phones write into a photo — never leaves the
 *    applicant's device at all. The server strips it too, but not sending it
 *    is strictly better than deleting it on arrival.
 *
 * 3. SCAN COVERAGE, as a side effect: a smaller file is under the scanner's
 *    size limit, so it gets scanned rather than skipped.
 *
 * Every failure path returns the ORIGINAL file. A helper that makes uploads
 * faster must never be the reason an upload becomes impossible.
 */

import { MAX_IMAGE_DIMENSION, SCAN_MAX_BYTES } from "./uploads";

/** Below this, resizing costs quality and saves nothing worth having. */
const SKIP_BELOW_BYTES = 512 * 1024;

const JPEG_QUALITY = 0.82;

function isShrinkableImage(type: string): type is "image/jpeg" | "image/png" {
  return type === "image/jpeg" || type === "image/png";
}

export async function shrinkImage(file: File): Promise<File> {
  if (!isShrinkableImage(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file, {
      // Applies the EXIF orientation flag while decoding, so a photo taken
      // sideways is drawn the right way up instead of being baked in rotated.
      imageOrientation: "from-image",
    });

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );

    // Already small in both dimensions and bytes: re-encoding would only lose
    // quality for no gain.
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    // Paint white first. Canvas starts transparent, and a PNG with alpha
    // encoded to JPEG below would otherwise turn its transparent regions
    // BLACK — which on a scanned document obliterates the page.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          type,
          type === "image/jpeg" ? JPEG_QUALITY : undefined,
        ),
      );

    let blob = await encode(file.type);

    // PNG is lossless, so a photograph saved as PNG stays huge however hard
    // it is compressed — and a file over the scan limit is a file that never
    // gets virus-scanned. Mirrors the same decision in normalize-upload.ts:
    // keep PNG when it is small (screenshots, line art, text scans, where PNG
    // is both smaller and sharper), fall back to JPEG only when it isn't.
    if (file.type === "image/png" && blob && blob.size > SCAN_MAX_BYTES) {
      const asJpeg = await encode("image/jpeg");
      if (asJpeg && asJpeg.size < blob.size) blob = asJpeg;
    }

    if (!blob || blob.size >= file.size) return file;

    // The declared type must describe the actual bytes — the server verifies
    // the two agree by reading the file's magic bytes.
    return new File([blob], file.name, {
      type: blob.type || file.type,
      lastModified: file.lastModified,
    });
  } catch (error) {
    // Old browser, decoder refusal, out of memory on a big image — all of
    // them mean "upload the original and let the server decide".
    console.warn("[shrink-image] falling back to the original file:", error);
    return file;
  }
}
