import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

export default withNextIntl(nextConfig);
