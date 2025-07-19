import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.FOR_STANDALONE == '1' ? { output: 'standalone' } : {}),
  env: {
    // Manually add variables you want to expose
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
    NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING,
    NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE,
    NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
  },
  experimental: {
    //nodeMiddleware: true,
    optimizePackageImports: [
      '@mui/icons-material',
      '@mui/material',
      '@mui/material-nextjs',
      '@mui/system',
      '@mui/x-data-grid',
      '@mui/x-data-grid-pro',
      '@mui/x-license',
      // '@microsoft/applicationinsights-web',
      // '@microsoft/applicationinsights-react-js',
      // '@microsoft/applicationinsights-clickanalytics-js',
      '@modelcontextprotocol/sdk',
      '@toolpad/core',
      // '@opentelemetry/api',
      '@opentelemetry/api-logs',
      '@opentelemetry/core',
      // '@opentelemetry/instrumentation',
      // '@opentelemetry/instrumentation-pino',
      '@opentelemetry/instrumentation-undici',
      '@opentelemetry/resources',
      '@opentelemetry/sdk-logs',
      '@opentelemetry/sdk-metrics',
      // '@opentelemetry/sdk-node',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      '@opentelemetry/semantic-conventions',
    ],
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
    useLightningcss: true,
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});
module.exports = withBundleAnalyzer(nextConfig);
//export default nextConfig;
