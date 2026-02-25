

/**
 * Bundle Analyzer Integration Helpers
 * --------------------------------------------------------------
 * This module provides small, typed utility wrappers for conditionally
 * enabling the `@next/bundle-analyzer` plugin inside `next.config.{js,ts}`.
 *
 * RATIONALE
 * Keeping this logic isolated:
 *  - Avoids inline `require` calls in your main Next.js config (cleaner & testable).
 *  - Centralizes the environment flag (`ANALYZE`) semantics.
 *  - Makes it easy to compose with other higher‑order config functions.
 *
 * ENVIRONMENT FLAG
 *  Set `ANALYZE=true` (e.g. via CLI or .env file) to enable the analyzer.
 *  When enabled, a static visual report for each bundle (client & server) is
 *  generated during build without auto‑opening a browser window.
 *
 * EXAMPLE (next.config.ts)
 * ```ts
 * import type { NextConfig } from 'next';
 * import { withBundleAnalyzer } from './lib/config/bundle-analyzers';
 *
 * // const baseConfig: NextConfig = { ... };
 * export default withBundleAnalyzer(baseConfig);
 * ```
 *
 * DISABLING
 *  Omit the env var or set `ANALYZE=false` (default) and the wrapper becomes
 *  a no‑op returning the original configuration unchanged.
 *
 * TESTING STRATEGY
 *  - Unit test can inject `process.env.ANALYZE = 'true'` and assert that the
 *    returned config has analyzer plugin side effects (or the module factory
 *    is invoked). For safety, restore the env var afterwards.
 *
 * NOTES
 *  - Uses `require` instead of `import` to prevent the analyzer dependency
 *    from being loaded at all when not needed (micro‑optimization & avoids
 *    potential ESM interop quirks in certain Node versions).
 */

import { NextConfig } from "next";

/**
 * Internal helper that always applies the analyzer to the provided Next.js
 * configuration object regardless of the `ANALYZE` environment flag.
 *
 * The generic type `TArg` (typically `NextConfig`) is preserved so downstream
 * tooling retains accurate typings.
 *
 * @internal Prefer using {@link withBundleAnalyzer} unless you explicitly need
 *           unconditional application (e.g. in a bespoke build script).
 * @param config - Original Next.js configuration object.
 * @returns The mutated (wrapped) configuration produced by the analyzer.
 */
const applyBundleAnalyzer = <TArg extends NextConfig>(config: TArg): TArg => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@next/bundle-analyzer')({
    enabled: true,
    openAnalyzer: false,
  })(config);
}

/**
 * Conditionally wraps a Next.js configuration object with the
 * `@next/bundle-analyzer` plugin only when `process.env.ANALYZE === 'true'`.
 * Otherwise returns the input configuration unchanged (transparent no‑op).
 *
 * Typical usage is a simple export in `next.config.ts` so that local or CI
 * builds can opt‑in to bundle visualization without touching source.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withBundleAnalyzer } from './lib/config/bundle-analyzers';
 * export default withBundleAnalyzer({ reactStrictMode: true });
 * ```
 *
 * @typeParam TArg - Concrete shape of the Next.js config (inferred).
 * @param config - Original Next.js configuration object.
 * @returns Either the analyzer‑enhanced config (when enabled) or the original.
 */
export const withBundleAnalyzer = <TArg extends NextConfig>(config: TArg): TArg => {
  if (process.env.ANALYZE === 'true') {
    return applyBundleAnalyzer(config);
  }
  return config;
};
