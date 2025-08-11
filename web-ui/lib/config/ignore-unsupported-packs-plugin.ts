import type { NextConfig } from 'next';

export const withIgnorePacks = <TArg extends NextConfig>(
    nextConfig: TArg
  ): TArg => {
    const originalWebpack = nextConfig.webpack;
    return {
      ...nextConfig,
      webpack: ((webpackConfig, args) => {
        const ret = originalWebpack?.(webpackConfig, args) ?? webpackConfig;
        webpackConfig.plugins.push(new args.webpack.IgnorePlugin({
          resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
        }));
        return ret;
      }) as NextConfig['webpack']
    };    
  };
