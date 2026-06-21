import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "true";
const repoBasePath = "/AI4Fishing";

const nextConfig: NextConfig = {
  transpilePackages: ["@inshoreiq/shared"],
  images: {
    unoptimized: true,
  },
  output: staticExport ? "export" : undefined,
  basePath: staticExport ? repoBasePath : undefined,
  assetPrefix: staticExport ? `${repoBasePath}/` : undefined,
  trailingSlash: staticExport,
};

export default nextConfig;
