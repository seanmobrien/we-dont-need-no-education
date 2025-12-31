import type { NextConfigPlugin } from './types';

export const withTypescriptConfig: NextConfigPlugin = (nextConfig) => {
  return {
    ...nextConfig,
    // outputFileTracingRoot: nextConfig.outputFileTracingRoot || process.cwd(),
    typedRoutes: true, // Enable type checking for next/router usage
  };
};
