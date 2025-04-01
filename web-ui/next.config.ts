import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    // Manually add variables you want to expose
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
    NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
  experimental: {
    // nodeMiddleware: true,
  },
  publicRuntimeConfig: {
    hostname: process.env.NEXT_PUBLIC_HOSTNAME,
  },
  serverExternalPackages: [
    '@opentelemetry/instrumentation',
    '@opentelemetry/instrumentation-pino',
    '@azure/monitor-opentelemetry-exporter',

    '@azure/monitor-opentelemetry',
    '@azure/opentelemetry-instumentation-azure-sdk',
    '@microsoft/applicationinsights-web',
    '@microsoft/applicationinsights-react-js',
    '@microsoft/applicationinsights-clickanalytics-js',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/sdk-node',
    '@opentelemetry/api',
    '@opentelemetry/exporter-jaeger',
    '@opentelemetry',
    'pino',
    'pdf-parse',
    'pg',
    '@auth/pg-adapter',
  ],
};

export default nextConfig;
