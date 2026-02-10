import type { NextConfig } from 'next/types';
import type { NextConfigPlugin } from './types';

export const withIgnorePacks: NextConfigPlugin = <TArg extends NextConfig>(
  nextConfig: TArg,
): TArg => {
  const originalWebpack = nextConfig.webpack;
  return {
    ...nextConfig,
    experimental: {
      ...(nextConfig.experimental ?? {}),
      optimizePackageImports: [
        '@ai-sdk',
        '@emotion/*',
        '@material-ui/core',
        '@material-ui/icons',
        '@material-ui/lab',
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
        '@opentelemetry/api',
        '@opentelemetry/api-logs',
        '@opentelemetry/core',
        '@opentelemetry/resources',
        '@opentelemetry/sdk-logs',
        '@opentelemetry/sdk-metrics',
        '@opentelemetry/sdk-trace-base',
        '@opentelemetry/sdk-trace-node',
        '@opentelemetry/semantic-conventions',
        '@googleapis/gmail',
        'googleapis',
        'js-tiktoken',
        '@auth/core',
        '@auth/drizzle-adapter',
        'next-auth',
        'ai',
        '@compliance-theater/*',
      ],
    },
    serverExternalPackages: [
      '@opentelemetry/sdk-node',
      '@opentelemetry/exporter-jaeger',
      '@opentelemetry/instrumentation',
      '@opentelemetry/instrumentation-undici',
      'cloudflare:sockets',
      'pino',
      'pdf-parse',
      'pg',
      '@auth/pg-adapter',
    ],
    webpack: (webpackConfig, args) => {
      const ret = originalWebpack?.(webpackConfig, args) ?? webpackConfig;
      webpackConfig.plugins.push(
        new args.webpack.IgnorePlugin({
          resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
        }),
      );
      return ret;
    },
  } satisfies TArg;
};
