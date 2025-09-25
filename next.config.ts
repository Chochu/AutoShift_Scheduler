import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/pa-scheduler' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/pa-scheduler' : '',
};

export default nextConfig;
