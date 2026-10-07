import type { NextConfig } from "next";

// A static site: `next build` writes plain HTML/CSS/JS to out/, served by nginx (see Dockerfile).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    // Where "Sign in" and "Start free" go. Baked in at build time.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://frontend-qa-qa-0794.up.railway.app",
    // Changes on every build, so screenshot URLs change when the images do and no cache serves old ones.
    NEXT_PUBLIC_BUILD: Date.now().toString(36),
  },
};

export default nextConfig;
