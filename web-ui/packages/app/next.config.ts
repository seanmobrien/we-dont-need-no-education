import type { NextConfig } from 'next';
import { withBundleAnalyzer } from './lib/config/bundle-analyzers';
import { withIgnorePacks } from './lib/config/ignore-unsupported-packs-plugin';
import { withStripRscPrefixPlugin } from './lib/config/strip-rsc-prefix-plugin';
import { withReactConfigFactory, withTypescriptConfig } from './lib/config';

let isForStandalone = false;
if (process && process.env && process.env.FOR_STANDALONE == '1') {
  isForStandalone = true;
}

console.log(`Next.js Config - FOR_STANDALONE:${process.env.FOR_STANDALONE} evaluates as ${isForStandalone}`);

export const nextConfig: NextConfig = withStripRscPrefixPlugin(
  withIgnorePacks(
    withBundleAnalyzer(
      withReactConfigFactory()(
        withTypescriptConfig({
          ...(isForStandalone
            ? { output: 'standalone' }
            : { output: 'standalone' }),
          experimental: {
            webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
          },
        }),
      ),
    ),
  ),
);

export default nextConfig;
