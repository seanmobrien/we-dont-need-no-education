import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.FOR_STANDALONE == '1' ? { output: 'standalone' } : {}),
  env: {
    // Manually add variables you want to expose
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
    AZURE_MONITOR_CONNECTION_STRING:
      process.env.AZURE_MONITOR_CONNECTION_STRING ??
      process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
    NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE,
  },
  experimental: {
    //nodeMiddleware: true,
    optimizePackageImports: [
      '@ai-sdk',
      '@mui/icons-material',
      '@mui/material',
      '@mui/material-nextjs',
      '@mui/system',
      '@mui/x-data-grid',
      '@mui/x-data-grid-pro',
      '@mui/x-license',
      '@toolpad/core',
      '@redis',
      '@azure/storage-blob',
      '@microsoft/applicationinsights-web',
      '@microsoft/applicationinsights-react-js',
      '@microsoft/applicationinsights-clickanalytics-js',
      '@modelcontextprotocol/sdk',
      '@toolpad/core',
      '@opentelemetry/api',
      '@opentelemetry/api-logs',
      '@opentelemetry/core',
      '@opentelemetry/instrumentation',
      '@opentelemetry/instrumentation-pino',
      '@opentelemetry/instrumentation-undici',
      '@opentelemetry/resources',
      '@opentelemetry/sdk-logs',
      '@opentelemetry/sdk-metrics',
      //'@opentelemetry/sdk-node',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      '@opentelemetry/semantic-conventions',
      '@googleapis/gmail',
      'googleapis',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      'js-tiktoken',
      '@auth/core',
      '@auth/drizzle-adapter',
      'next-auth',
      'ai',
    ],
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
    useLightningcss: true,
  },
  publicRuntimeConfig: {
    hostname: process.env.NEXT_PUBLIC_HOSTNAME,
  },
  serverExternalPackages: [
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-jaeger',
    'cloudflare:sockets',
    'pino',
    'pdf-parse',
    'pg',
    '@auth/pg-adapter',
  ],
  webpack: (config, { webpack, isServer }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
      }),
    );
    if (!isServer) {
      // For client-side, we need to ensure that the following packages are not bundled
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});
export default withBundleAnalyzer(nextConfig);
