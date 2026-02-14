export const withWorkspaceSourceImports = (nextConfig) => {
    if (process.env.WORKSPACE_SOURCE_IMPORTS !== '1') {
        return nextConfig;
    }
    const originalWebpack = nextConfig.webpack;
    return {
        ...nextConfig,
        webpack: ((config, args) => {
            config = originalWebpack?.(config, args) ?? config;
            config.resolve = config.resolve ?? {};
            config.resolve.conditionNames = [
                'workspace-source',
                ...(config.resolve.conditionNames ?? ['...']),
            ];
            return config;
        }),
    };
};
//# sourceMappingURL=workspace-source-imports.js.map