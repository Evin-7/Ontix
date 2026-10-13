import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["@prisma/adapter-neon", "@neondatabase/serverless"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
