import { S3Client } from "@aws-sdk/client-s3";

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
