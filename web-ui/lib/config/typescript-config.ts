import type { NextConfigPlugin } from './types';

export const withTypescriptConfig: NextConfigPlugin = (nextConfig) => {
  return {
    ...nextConfig,
    // productionBrowserSourceMaps: true, // for now lets enable source code maps so our error logs are undertsandable.
    // typedRoutes: true, // Enable type checking for next/router usage
  };
};
