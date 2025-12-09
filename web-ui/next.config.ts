import type { NextConfig } from 'next';
import { withBundleAnalyzer } from '@/lib/config/bundle-analyzers';
import { withIgnorePacks } from '@/lib/config/ignore-unsupported-packs-plugin';
import { withStripRscPrefixPlugin } from '@/lib/config/strip-rsc-prefix-plugin';
import { withReactConfigFactory, withTypescriptConfig } from './lib/config';

export const nextConfig: NextConfig = withStripRscPrefixPlugin(
  withIgnorePacks(
    withBundleAnalyzer(
      withReactConfigFactory()(
        withTypescriptConfig({
          ...(process.env.FOR_STANDALONE == '1'
            ? { output: 'standalone' }
            : {}),
          experimental: {
            webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
          },
          publicRuntimeConfig: {
            hostname: process.env.NEXT_PUBLIC_HOSTNAME,
          },
        }),
      ),
    ),
  ),
);

export default nextConfig;
