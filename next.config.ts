import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A separate output directory lets the signup check run without interrupting the preview.
  distDir: process.env.RVPY_TEST_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
