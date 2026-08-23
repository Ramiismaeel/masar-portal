import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

/**
 * Where a browser's direct upload lands BEFORE it has been scanned.
 *
 * Vercel refuses any function request body over 4.5 MB at the edge, so a large
 * document cannot travel through a Server Action at all. The browser therefore
 * PUTs it straight to R2 and the server promotes it afterwards.
 *
 * Nothing here is ever served to anyone: `getDocumentDownloadUrl` is only ever
 * called with a `storageKey` from the database, and a quarantine object has no
 * database row until after it has been scanned and copied to its permanent
 * key. This prefix is the reason the §10 rule still holds — an unscanned file
 * never reaches its PERMANENT location.
 *
 * ⚠️ REQUIRES A LIFECYCLE RULE ON THE BUCKET, configured in the Cloudflare
 * dashboard (it cannot be set from here): expire objects under `quarantine/`
 * after 1 day. Without it, every abandoned upload — closed tab, failed scan,
 * lost connection — is kept indefinitely, which is both a storage leak and a
 * GDPR problem, since those objects are real applicant documents.
 */
export const QUARANTINE_PREFIX = "quarantine/";

/**
 * A short-lived URL the browser can PUT one specific file to.
 *
 * `contentLength` is signed, not advisory. Verified against R2: including it
 * puts `content-length` into the signature's SignedHeaders, and R2 rejects a
 * body of any other size with 403. So the client can upload exactly the number
 * of bytes the server approved — which is what stops an authenticated user
 * from filling the bucket with a file far larger than the limit.
 *
 * Note that ContentType is deliberately NOT signed: R2 accepted a mismatched
 * content-type in testing, so binding it would give false confidence. The real
 * control is that the server reads the file's magic bytes after upload and
 * sets the ContentType itself when promoting the object.
 *
 * Five minutes: long enough for a big file on a slow connection, short enough
 * that a leaked URL is not a lasting write handle into the bucket.
 */
export function getQuarantineUploadUrl(
  key: string,
  contentLength: number,
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentLength: contentLength }),
    { expiresIn: 300 },
  );
}

/** Reads a whole object into memory. Only used for files already size-checked. */
export async function getObjectBytes(key: string): Promise<Buffer> {
  const response = await r2.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  );

  if (!response.Body) {
    throw new Error(`R2 object ${key} has no body`);
  }

  return Buffer.from(await response.Body.transformToByteArray());
}

/** Best-effort delete. Never throws — callers use it in cleanup paths. */
export async function deleteObjectQuietly(key: string): Promise<void> {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch (error) {
    console.error(`[r2] failed to delete ${key} — now orphaned:`, error);
  }
}
