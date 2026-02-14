const applyBundleAnalyzer = (config) => {
    return require('@next/bundle-analyzer')({
        enabled: true,
        openAnalyzer: false,
    })(config);
};
export const withBundleAnalyzer = (config) => {
    if (process.env.ANALYZE === 'true') {
        return applyBundleAnalyzer(config);
    }
    return config;
};
//# sourceMappingURL=bundle-analyzers.js.map