import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    // Manually add variables you want to expose
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
  },
  optimizePackageImports: true,
  publicRuntimeConfig: {
    hostname: process.env.NEXT_PUBLIC_HOSTNAME,
  },
};

export default nextConfig;
