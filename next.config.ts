import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both ship non-bundleable Node assets: resvg a platform .node binary, satori a
  // harfbuzz .wasm. Bundling either rewrites its paths and it fails at runtime,
  // not at build. GOTCHAS 016.
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
};

export default nextConfig;
