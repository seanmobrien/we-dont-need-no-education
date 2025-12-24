import type { NextConfigPlugin } from './types';

export const withTypescriptConfig: NextConfigPlugin = (nextConfig) => {
  return {
    ...nextConfig,
    typedRoutes: true, // Enable type checking for next/router usage
  };
};
