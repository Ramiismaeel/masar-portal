import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB — well under a scanned passport or a phone photo.
      // Matches MAX_FILE_SIZE_BYTES in src/lib/uploads.ts, plus headroom for
      // multipart/form-data overhead.
      bodySizeLimit: "12mb",
    },
  },
};

// Points at src/i18n/request.ts, which resolves the locale from a cookie —
// there is no [locale] route segment. See docs/roadmap.md "i18n" for why.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// @serwist/turbopack, not @serwist/next — the latter's webpack plugin
// doesn't run under Turbopack, this project's bundler for both dev and
// build. The actual service worker build happens in src/app/[path]/route.ts;
// this just marks esbuild as a server-external package. See docs/roadmap.md
// "PWA".
export default withSerwist(withNextIntl(nextConfig));
