export const StripRscPrefixPlugin = {
    apply(compiler) {
        compiler.hooks.compilation.tap('StripRscPrefixPlugin', (compilation) => {
            compilation.hooks.processAssets.tap({
                name: 'StripRscPrefixPlugin',
                stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
            }, (assets) => {
                for (const [name, asset] of Object.entries(assets)) {
                    if (!name.endsWith('.map'))
                        continue;
                    const raw = String(typeof asset.source === 'function'
                        ? asset.source()
                        : asset.source);
                    if (!raw.includes('(rsc)') && !raw.includes('(ssr)'))
                        continue;
                    try {
                        const map = JSON.parse(raw);
                        const normalize = (s) => {
                            if (!s.includes('(rsc)') && !s.includes('(ssr)'))
                                return s;
                            let out = s.replace(/\((?:rsc|ssr)\)\/(?:\.\/*)?/, '/');
                            out = out.replace(/^\/+/, '/');
                            return out;
                        };
                        map.sources = map.sources.map((s) => normalize(s));
                        compilation.updateAsset(name, new compiler.webpack.sources.RawSource(JSON.stringify(map)));
                    }
                    catch {
                    }
                }
            });
        });
    },
};
export const withStripRscPrefixPlugin = (nextConfig) => {
    const originalWebpack = nextConfig.webpack;
    return {
        ...nextConfig,
        webpack: ((config, args) => {
            config = originalWebpack?.(config, args) ?? config;
            config.plugins.push(StripRscPrefixPlugin);
            return config;
        }),
    };
};
//# sourceMappingURL=strip-rsc-prefix-plugin.js.map