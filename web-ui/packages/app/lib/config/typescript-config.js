import fs from 'fs/promises';
import path from 'path';
class EnsureNextServerRuntimePlugin {
    apply(compiler) {
        compiler.hooks.afterEmit.tapPromise('EnsureNextServerRuntimePlugin', async () => {
            const nextRoot = path.dirname(require.resolve('next/package.json'));
            const mappings = [
                ['dist/shared', 'shared'],
                ['dist/server', 'server'],
                ['dist/lib', 'lib'],
            ];
            await Promise.all(mappings.map(async ([fromSuffix, targetDir]) => {
                const source = path.join(nextRoot, fromSuffix);
                const destination = path.join(compiler.outputPath, targetDir);
                await fs.mkdir(destination, { recursive: true });
                await fs.cp(source, destination, { recursive: true });
            }));
        });
    }
}
export const withTypescriptConfig = (nextConfig) => {
    const originalWebpack = nextConfig.webpack;
    const outputFileTracingRoot = nextConfig.outputFileTracingRoot || path.resolve(process.cwd(), '../..');
    return {
        ...nextConfig,
        outputFileTracingRoot,
        typedRoutes: true,
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
//# sourceMappingURL=typescript-config.js.map