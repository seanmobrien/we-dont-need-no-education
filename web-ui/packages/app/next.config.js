import path from 'path';
import { withBundleAnalyzer } from './lib/config/bundle-analyzers';
import { withIgnorePacks } from './lib/config/ignore-unsupported-packs-plugin';
import { withStripRscPrefixPlugin } from './lib/config/strip-rsc-prefix-plugin';
import { withEnsureChunkSymlinks, withReactConfigFactory, withTypescriptConfig, withWorkspaceSourceImports } from './lib/config';
export const nextConfig = withStripRscPrefixPlugin(withWorkspaceSourceImports(withIgnorePacks(withBundleAnalyzer(withReactConfigFactory()(withTypescriptConfig(withEnsureChunkSymlinks({
    outputFileTracingRoot: path.join(__dirname, '..', '..'),
    output: 'standalone',
    experimental: {
        webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID'],
    },
})))))));
export default nextConfig;
//# sourceMappingURL=next.config.js.map