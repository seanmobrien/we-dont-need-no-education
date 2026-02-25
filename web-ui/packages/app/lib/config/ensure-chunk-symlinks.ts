import fs from 'fs';
import path from 'path';
import type { NextConfig } from 'next';
import type { NextConfigPlugin } from './types';

class EnsureChunkSymlinksPlugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const withEnsureChunkSymlinks: NextConfigPlugin = <
  TArg extends NextConfig,
>(
  nextConfig: TArg,
): TArg => {
  const originalWebpack = nextConfig.webpack;
  return {
    ...nextConfig,
    webpack: ((config, args) => {
      config = originalWebpack?.(config, args) ?? config;
      if (!args.isServer) return config;
      config.plugins = config.plugins ?? [];
      config.plugins.push(new EnsureChunkSymlinksPlugin());
      return config;
    }) as NextConfig['webpack'],
  } as TArg;
};
