import fs from 'fs/promises';
import path from 'path';
import type { NextConfigPlugin, WebpackCompiler } from './types';

type RuntimeCopyCompiler = WebpackCompiler & {
  outputPath: string;
  hooks: WebpackCompiler['hooks'] & {
    afterEmit: {
      tapPromise: (name: string, handler: () => Promise<void>) => void;
    };
  };
};

class EnsureNextServerRuntimePlugin {
  apply(compiler: RuntimeCopyCompiler) {
    compiler.hooks.afterEmit.tapPromise(
      'EnsureNextServerRuntimePlugin',
      async () => {
        const nextRoot = path.dirname(require.resolve('next/package.json'));
        const mappings: Array<[string, string]> = [
          ['dist/shared', 'shared'],
          ['dist/server', 'server'],
          ['dist/lib', 'lib'],
        ];

        await Promise.all(
          mappings.map(async ([fromSuffix, targetDir]) => {
            const source = path.join(nextRoot, fromSuffix);
            const destination = path.join(compiler.outputPath, targetDir);
            await fs.mkdir(destination, { recursive: true });
            await fs.cp(source, destination, { recursive: true });
          }),
        );
      },
    );
  }
}

export const withTypescriptConfig: NextConfigPlugin = (nextConfig) => {
  const originalWebpack = nextConfig.webpack;
  const outputFileTracingRoot =
    nextConfig.outputFileTracingRoot || path.resolve(process.cwd(), '../..');

  return {
    ...nextConfig,
    outputFileTracingRoot, // Trace from monorepo root so hoisted deps are included
    typedRoutes: true, // Enable type checking for next/router usage
    webpack: (config, args) => {
      const updatedConfig = originalWebpack?.(config, args) ?? config;

      if (args.isServer) {
        updatedConfig.plugins = updatedConfig.plugins || [];
        updatedConfig.plugins.push(new EnsureNextServerRuntimePlugin());
      }

      return updatedConfig;
    },
  };
};
