import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3_ENDPOINT in .env is the full R2 bucket URL
 * (https://<account>.r2.cloudflarestorage.com/<bucket>), not just the host.
 * The S3 client needs the host ALONE — it appends the bucket itself from
 * S3_BUCKET on every request. Passing the full URL through unchanged would
 * double the bucket segment on every path (".../bucket/bucket/key").
 */
const endpoint = new URL(process.env.S3_ENDPOINT!).origin;

const globalForR2 = globalThis as unknown as { r2?: S3Client };

export const r2 =
  globalForR2.r2 ??
  new S3Client({
    region: process.env.S3_REGION,
    endpoint,
    // Path-style (endpoint/bucket/key) rather than virtual-hosted
    // (bucket.endpoint/key) — the form Cloudflare's R2 docs recommend.
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForR2.r2 = r2;
}

export const R2_BUCKET = process.env.S3_BUCKET!;

/**
 * A time-limited URL an admin's browser can fetch a document from directly.
 *
 * The bucket itself stays private — nothing is ever made public — so this is
 * the only way to view an uploaded file. Signed for 10 minutes: long enough
 * to open the file, short enough that a copied/shared link doesn't stay a
 * live door into someone's passport scan.
 */
export function getDocumentDownloadUrl(storageKey: string): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }),
    { expiresIn: 600 },
  );
}
