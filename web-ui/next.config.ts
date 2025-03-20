import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    // Manually add variables you want to expose
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
  },
  publicRuntimeConfig: {
    hostname: process.env.NEXT_PUBLIC_HOSTNAME,
  },
  serverExternalPackages: [
    '@azure/monitor-opentelemetry',
    '@azure/opentelemetry-instumentation-azure-sdk',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/sdk-node',
    '@opentelemetry/instrumentation',
    '@opentelemetry/api',
    '@opentelemetry/exporter-jaeger',
    '@opentelemetry',
    'pino',
    'pg',
    '@auth/pg-adapter',
  ],
};

export default nextConfig;
