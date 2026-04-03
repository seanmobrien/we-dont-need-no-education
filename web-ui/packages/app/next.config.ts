import type { NextConfig } from 'next';
import { withBundleAnalyzer } from './lib/config/bundle-analyzers';
import { withIgnorePacks } from './lib/config/ignore-unsupported-packs-plugin';
import { withStripRscPrefixPlugin } from './lib/config/strip-rsc-prefix-plugin';
import { withDevelopmentSourceImports, withEnsureChunkSymlinks, withReactConfigFactory, withTypescriptConfig } from './lib/config';

export const nextConfig: NextConfig = withStripRscPrefixPlugin(
  withDevelopmentSourceImports(
    withIgnorePacks(
      withBundleAnalyzer(
        withReactConfigFactory()(
          withTypescriptConfig(
            withEnsureChunkSymlinks({
              experimental: {
                webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
              },
            }),
          ),
        ),
      ),
    ),
  ),
);

export default nextConfig;
