import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  basePath: "/lgallery",
  output: "standalone",
  transpilePackages: ["@home-server/contracts", "@home-server/navigation", "@home-server/shell"],
  turbopack: { root: path.resolve(import.meta.dirname, "../..") },
};

export default nextConfig;
