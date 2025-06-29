import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.FOR_STANDALONE == '1' ? { output: 'standalone' } : {}),
  env: {
    // Manually add variables you want to expose
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
    NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING,
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT:
      process.env.NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT,
    NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE,
  },
  experimental: {
    //nodeMiddleware: true,
  },
  /*
  // Build optimization to prevent hanging
  generateBuildId: async () => {
    // Use a simple build ID to avoid complex generation during build
    return 'build-' + Date.now();
  },
  */
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
    'cloudflare:sockets',
    'pino',
    'pdf-parse',
    'pg',
    '@auth/pg-adapter',
  ],
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
      }),
    );
    return config;
  },
};

export default nextConfig;
