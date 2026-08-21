import type { NextConfig } from "next";

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

export default nextConfig;
