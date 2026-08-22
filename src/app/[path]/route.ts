import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Serves the compiled service worker (and its sourcemap) at /sw.js —
 * @serwist/next's webpack-based InjectManifest plugin doesn't run under
 * Turbopack at all (confirmed live: `next build` produced no public/sw.js,
 * with no error, just a warning easy to miss), and Turbopack is this
 * project's bundler for both dev and build, not an opt-in. This is the
 * Turbopack-native path: a static Route Handler that bundles src/app/sw.ts
 * with esbuild and serves the result, instead of writing a physical file to
 * public/ at build time. See docs/roadmap.md "PWA".
 *
 * [path] (not [...path]) because the underlying manifest only ever produces
 * single-segment filenames (sw.js, sw.js.map) — this only ever serves the
 * two, dynamicParams: false rejects anything else with a 404.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
  });
