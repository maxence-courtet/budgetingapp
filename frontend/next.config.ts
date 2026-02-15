import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || "",
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || "",
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || "",
    AUTH0_SECRET: process.env.AUTH0_SECRET || "",
    APP_BASE_URL: process.env.APP_BASE_URL || "",
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || "",
  },
};

export default nextConfig;
