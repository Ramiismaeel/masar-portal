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
  | { status: "error"; message: string };

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
    return { status: "error", message: "Could not reach the scanning service." };
  }

  if (!response.ok) {
    console.error("[virus-scan] non-OK response:", response.status);
    return { status: "error", message: "The scanning service returned an error." };
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
