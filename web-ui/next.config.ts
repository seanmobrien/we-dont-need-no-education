import type { NextConfig } from 'next';
import { withBundleAnalyzer } from '@/lib/config/bundle-analyzers';
import { withIgnorePacks } from '@/lib/config/ignore-unsupported-packs-plugin';
import { withPublicEnv } from '@/lib/config/public-env';
//import { withStripRscPrefixPlugin } from '@/lib/config/strip-rsc-prefix-plugin';

export const nextConfig: NextConfig =
  //withStripRscPrefixPlugin(
  withPublicEnv(
    withIgnorePacks(
      withBundleAnalyzer({
        ...(process.env.FOR_STANDALONE == '1' ? { output: 'standalone' } : {}),
        experimental: {
          //nodeMiddleware: true,
          optimizePackageImports: [
            //'@ai-sdk',
            '@mui/icons-material',
            '@mui/material',
            '@mui/material-nextjs',
            '@mui/system',
            '@mui/x-data-grid',
            '@mui/x-data-grid-pro',
            '@mui/x-license',
            '@toolpad/core',
            //'@redis',
            //'@azure/storage-blob',
            /*
            '@microsoft/applicationinsights-web',
            '@microsoft/applicationinsights-react-js',
            '@microsoft/applicationinsights-clickanalytics-js',
            '@modelcontextprotocol/sdk',
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
      */
            '@googleapis/gmail',
            'googleapis',
            // '@emotion/react',
            // '@emotion/styled',
            //'@emotion/cache',
            //'js-tiktoken',
            //'@auth/core',
            //'@auth/drizzle-adapter',
            //'next-auth',
            //'ai',
            // 'pino',
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
        webpack: (config, { webpack }) => {
          config.plugins.push(
            new webpack.IgnorePlugin({
              resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
            }),
          );
          /*
          config.plugins.push(StripRscPrefixPlugin);
    if (!isServer) {
      // For client-side, we need to ensure that the following packages are not bundled
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    */
          return config;
        },
      }),
    ),
  );

export default nextConfig;
