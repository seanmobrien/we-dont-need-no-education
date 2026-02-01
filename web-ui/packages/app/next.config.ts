import fs from 'fs';
import path from 'path';
import type { NextConfig } from 'next';
import { withBundleAnalyzer } from './lib/config/bundle-analyzers';
import { withIgnorePacks } from './lib/config/ignore-unsupported-packs-plugin';
import { withStripRscPrefixPlugin } from './lib/config/strip-rsc-prefix-plugin';
import { withReactConfigFactory, withTypescriptConfig } from './lib/config';

let isForStandalone = false;
if (process && process.env && process.env.FOR_STANDALONE == '1') {
  isForStandalone = true;
}

class EnsureChunkSymlinksPlugin {
  apply(compiler: any) {
    compiler.hooks.done.tap('EnsureChunkSymlinksPlugin', () => {
      const chunksPath = path.join(compiler.outputPath, 'chunks');
      const mappings: Array<[string, string]> = [
        ['shared', 'shared'],
        ['server', 'server'],
      ];

      for (const [fromSuffix, toSuffix] of mappings) {
        const source = path.join(chunksPath, fromSuffix);
        const target = path.join(compiler.outputPath, toSuffix);

        if (!fs.existsSync(source) || fs.existsSync(target)) continue;

        try {
          fs.rmSync(target, { recursive: true, force: true });
        } catch {}

        try {
          fs.symlinkSync(source, target, 'dir');
        } catch {
          fs.cpSync(source, target, { recursive: true });
        }
      }
    });
  }
}

export const nextConfig: NextConfig = withStripRscPrefixPlugin(
  withIgnorePacks(
    withBundleAnalyzer(
      withReactConfigFactory()(
        withTypescriptConfig({
          // Keep tracing rooted at the workspace to avoid mis-detected lockfiles.
          outputFileTracingRoot: path.join(__dirname, '..', '..'),
          output: 'standalone',
          experimental: {
            webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
          },
          webpack: (config, { isServer }) => {
            if (!isServer) return config;
            config.plugins = config.plugins ?? [];
            config.plugins.push(new EnsureChunkSymlinksPlugin());
            return config;
          },
        }),
      ),
    ),
  ),
);

export default nextConfig;
