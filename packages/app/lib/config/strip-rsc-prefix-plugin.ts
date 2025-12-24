/**
 * Webpack plugin: StripRscPrefixPlugin
 * --------------------------------------------------------------
 * Purpose
 *   Next.js (React Server Components / SSR) sometimes emits source maps whose
 *   `sources` entries are prefixed with synthetic roots like:
 *     /(rsc)/./lib/ai/middleware/chat-history/import-incoming-message.ts
 *     /(rsc)/lib/ai/... or (rsc)/./lib/...
 *     /(ssr)/... (observed for certain server bundles)
 *   These virtual path segments break debugger resolution (VS Code / Chrome)
 *   because no real directory named `(rsc)` or `(ssr)` exists inside the
 *   workspace. The result is: "Source not found" when setting breakpoints.
 *
 * What this plugin does
 *   - Runs during the `PROCESS_ASSETS_STAGE_DEV_TOOLING` stage.
 *   - Scans every emitted `*.map` asset.
 *   - If any source path contains `(rsc)` or `(ssr)` at its start (optionally
 *     preceded by a slash) with optional `./` segments, it rewrites the prefix
 *     to a single leading slash `/` so the remainder of the path becomes
 *     relative to the project root (which standard sourceMapPathOverrides can
 *     then map to the workspace).
 *
 * Regex logic (see `normalize`):
 *     ^\/?\((?:rsc|ssr)\)\/(?:\.\/*)?
 *   Breakdown:
 *     ^            : start of string
 *     \/?          : optional leading slash
 *     \(           : literal '('
 *     (?:rsc|ssr)  : either 'rsc' or 'ssr'
 *     \)           : literal ')'
 *     \/           : following slash
 *     (?:\.\/*)?  : zero or one sequence of "./" possibly with extra slashes
 *
 * Why fix the grouping
 *   The previous pattern `^\/?\(rsc|ssr\)\/` incorrectly alternated between
 *   the literal substring "(rsc" and "ssr)" (due to the placement of `|`),
 *   so it would *never* match fully-formed prefixes `(rsc)/` or `(ssr)/`.
 *   This patch corrects the alternation so both markers normalize properly.
 *
 * Performance considerations
 *   - Operates only on `.map` assets.
 *   - Parses JSON once per map containing the tokens; unaffected maps are
 *     skipped quickly via `includes` guard.
 *   - Complexity is O(n) in number of maps + O(m) in number of sources entries.
 *
 * Safety / Failure modes
 *   - Malformed JSON source maps are ignored (best-effort approach).
 *   - Non-matching sources remain untouched.
 *   - If Next.js changes its virtual prefix format, extend the regex.
 *
 * Integration (Next.js `next.config.{js,ts}`):
 *   import { StripRscPrefixPlugin } from './lib/config/strip-rsc-prefix-plugin';
 *   export default {
 *     webpack(config) {
 *       config.plugins.push(StripRscPrefixPlugin);
 *       return config;
 *     }
 *   };
 *
 * Testing suggestions
 *   - Build (or dev) with a known RSC map, then grep the resulting `.map` for
 *     `"/(rsc)/"` before and after enabling the plugin.
 *   - Add a Jest snapshot test that feeds a small fabricated source map object
 *     through the `normalize` logic (extracted if you want stronger tests).
 */
import type { NextConfig } from 'next';
import type { WebpackCompilation, WebpackPlugin, WebpackCompiler, RawSourceClassProps, WebpackAsset } from "./types";

/**
 * Webpack plugin object normalizing nextjs source maps.
 * @public
 */
export const StripRscPrefixPlugin: WebpackPlugin = {
  apply(compiler: WebpackCompiler) {
    compiler.hooks.compilation.tap(
      'StripRscPrefixPlugin',
      (compilation: WebpackCompilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'StripRscPrefixPlugin',
            stage:
              compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
          },
          (assets: Record<PropertyKey, RawSourceClassProps | WebpackAsset>) => {
            for (const [name, asset] of Object.entries(assets)) {
              if (!name.endsWith('.map')) continue;
              const raw = String(
                typeof asset.source === 'function'
                  ? asset.source()
                  : asset.source,
              );
              if (!raw.includes('(rsc)') && !raw.includes('(ssr)')) continue;
              try {
                const map = JSON.parse(raw);

                // Normalize any leading (rsc)/, /(rsc)/, (rsc)/./, /(rsc)/./
                // Pattern explanation:
                // ^         -> start
                // /?        -> optional leading slash
                // \(rsc\)/  -> literal (rsc)/
                // (?:\./)*  -> optional one or more './'
                /**
                 * Normalize a single source path by removing a leading synthetic
                 * `(rsc)` / `(ssr)` prefix (optionally with leading slash and `./`),
                 * collapsing it to a single root slash.
                 * @param s Raw source path value from a source map.
                 * @returns Normalized path (unchanged if no synthetic prefix).
                 */
                const normalize = (s: string): string => {
                  if (!s.includes('(rsc)') && !s.includes('(ssr)')) return s;
                  // Correct grouping: match "(rsc)" or "(ssr)" token at start.
                  let out = s.replace(/^\/?\((?:rsc|ssr)\)\/(?:\.\/*)?/, '/');
                  // Guard against accidental doubled slashes after replacement.
                  out = out.replace(/^\/+/, '/');
                  return out;
                };

                map.sources = map.sources.map((s: string) => normalize(s));

                compilation.updateAsset(
                  name,
                  new compiler.webpack.sources.RawSource(JSON.stringify(map)),
                );
              } catch {
                // ignore malformed map
              }
            }
          },
        );
      },
    );
  },
};

export const withStripRscPrefixPlugin = <
  TArg extends NextConfig
>(
  nextConfig: TArg
): TArg => {
    const originalWebpack = nextConfig.webpack;
    return {
      ...nextConfig,
      webpack: ((config, args) => {
        config = originalWebpack?.(config, args) ?? config;
        config.plugins.push(StripRscPrefixPlugin);
        return config;
      }) as NextConfig['webpack'],
    } as TArg;
};
