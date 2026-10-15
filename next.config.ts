import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A separate output directory lets the signup check run without interrupting the preview.
  distDir: process.env.RVPY_TEST_DIST_DIR ?? ".next",
  devIndicators: process.env.RVPY_TEST_DIST_DIR ? false : undefined,
  cacheComponents: true,
  // The student-sheet import posts an .xlsx file (capped at 4 MB in the action).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
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
