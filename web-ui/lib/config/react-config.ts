import type { NextConfigPluginFactory } from './types';

export type ReactConfigOptions = {
  reactCompiler?: boolean;
  disableSourceMaps?: boolean;
};

export const withReactConfigFactory: NextConfigPluginFactory<
  ReactConfigOptions
> =
  ({ reactCompiler = true, disableSourceMaps = false } = {}) =>
  (nextConfig) => {
    return {
      ...nextConfig,
      poweredByHeader: false,
      productionBrowserSourceMaps: disableSourceMaps !== true,
      reactStrictMode: true,
      experimental: {
        ...nextConfig.experimental,
        reactCompiler: reactCompiler !== false, // Fancy new react compiler, defaulting to true.  Supports auto-memoization
      },
    };
  };

export const withReactConfig = withReactConfigFactory();
