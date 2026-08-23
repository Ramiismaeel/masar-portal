/**
 * Cloudmersive's virus-scan REST API, called directly with fetch rather than
 * their client SDK — it's one endpoint, and a hand-rolled call is a lot less
 * code than a generated API client for that.
 *
 * Called synchronously in the upload Server Action, in between validating
 * the file and writing it to R2 — see docs/roadmap.md's upload pipeline
 * order. Nothing reaches R2, and no Document row is created, unless this
 * returns clean.
 */

export type ScanResult =
  | { status: "clean" }
  | { status: "infected"; viruses: string[] }
  /**
   * `retryable` is the difference between "the service hiccuped" and "this
   * file will never scan". Collapsing the two is what made a hard 400 —
   * Cloudmersive refusing an over-sized file on the free tier — surface to
   * applicants as "please try again shortly", advice that could never work
   * no matter how many times they followed it.
   */
  | { status: "error"; retryable: boolean; message: string };

type CloudmersiveScanResponse = {
  CleanResult: boolean;
  FoundViruses?: { VirusName: string }[] | null;
};

export async function scanFileForViruses(
  bytes: Buffer,
  fileName: string,
): Promise<ScanResult> {
  const form = new FormData();
  // Buffer's underlying ArrayBufferLike is wider than Blob's BlobPart type
  // accepts (it permits SharedArrayBuffer); copying into a plain Uint8Array
  // satisfies the type without changing anything at runtime.
  form.append("inputFile", new Blob([new Uint8Array(bytes)]), fileName);

  let response: Response;

  try {
    response = await fetch("https://api.cloudmersive.com/virus/scan/file", {
      method: "POST",
      headers: { Apikey: process.env.VIRUS_SCAN_API_KEY! },
      body: form,
    });
  } catch (error) {
    console.error("[virus-scan] request failed:", error);
    return {
      status: "error",
      retryable: true,
      message: "Could not reach the scanning service.",
    };
  }

  if (!response.ok) {
    // Read the BODY, not just the status. Cloudmersive explains itself in
    // plain text here ("Paid plan required: Input file was larger than the
    // limit for the free tier"), and throwing that away is the single reason
    // an obvious, self-describing failure looked like a mystery in the logs.
    const body = await response.text().catch(() => "<unreadable>");
    console.error(
      `[virus-scan] non-OK response: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`,
    );

    // 4xx means the request itself is unacceptable — too large, bad key, out
    // of quota. Retrying sends the identical bytes and gets the identical
    // answer. 5xx and transport failures are the ones worth retrying.
    return {
      status: "error",
      retryable: response.status >= 500,
      message: `The scanning service rejected the request (${response.status}).`,
    };
  }

  const data = (await response.json()) as CloudmersiveScanResponse;

  if (data.CleanResult) {
    return { status: "clean" };
  }

  return {
    status: "infected",
    viruses: (data.FoundViruses ?? []).map((v) => v.VirusName),
  };
}
