import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone: smaller image and less memory than `next start`.
  output: "standalone",
  // Trace files from this folder (a lockfile higher up would otherwise nest the output).
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },
};

export default nextConfig;
