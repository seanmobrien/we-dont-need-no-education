export const withReactConfigFactory = ({ reactCompiler = true, disableSourceMaps = false } = {}) => (nextConfig) => {
    return {
        ...nextConfig,
        poweredByHeader: false,
        productionBrowserSourceMaps: disableSourceMaps !== true,
        reactProductionProfiling: disableSourceMaps !== true,
        reactStrictMode: true,
        experimental: {
            ...nextConfig.experimental,
            reactCompiler: reactCompiler !== false,
        },
    };
};
export const withReactConfig = withReactConfigFactory();
//# sourceMappingURL=react-config.js.map