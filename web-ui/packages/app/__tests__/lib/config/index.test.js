import { withIgnorePacks, withStripRscPrefixPlugin, withBundleAnalyzer, } from '@/lib/config';
import { StripRscPrefixPlugin } from '@/lib/config/strip-rsc-prefix-plugin';
import { withTypescriptConfig } from '@/lib/config/typescript-config';
import { withReactConfig, withReactConfigFactory, } from '@/lib/config/react-config';
describe('lib/config/index.ts', () => {
    describe('exports', () => {
        it('should export all expected functions and objects', () => {
            expect(withIgnorePacks).toBeDefined();
            expect(typeof withIgnorePacks).toBe('function');
            expect(withStripRscPrefixPlugin).toBeDefined();
            expect(typeof withStripRscPrefixPlugin).toBe('function');
            expect(withBundleAnalyzer).toBeDefined();
            expect(typeof withBundleAnalyzer).toBe('function');
        });
    });
    describe('withIgnorePacks', () => {
        const mockWebpack = {
            IgnorePlugin: jest.fn().mockImplementation((config) => ({
                pluginName: 'IgnorePlugin',
                config,
            })),
        };
        const mockWebpackConfig = {
            plugins: [],
            entry: './src/index.js',
        };
        const mockArgs = {
            webpack: mockWebpack,
            buildId: 'test-build',
            dev: true,
            isServer: false,
            defaultLoaders: {},
        };
        beforeEach(() => {
            mockWebpackConfig.plugins = [];
        });
        it('should preserve existing Next.js configuration', () => {
            const originalConfig = {
                reactStrictMode: true,
                env: { TEST: 'value' },
            };
            const result = withIgnorePacks(originalConfig);
            expect(result.reactStrictMode).toBe(true);
            expect(result.env).toEqual({ TEST: 'value' });
        });
        it('should add webpack configuration with IgnorePlugin', () => {
            const originalConfig = {};
            const result = withIgnorePacks(originalConfig);
            expect(result.webpack).toBeDefined();
            expect(typeof result.webpack).toBe('function');
            const webpackResult = result.webpack(mockWebpackConfig, mockArgs);
            expect(mockWebpack.IgnorePlugin).toHaveBeenCalledWith({
                resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
            });
            expect(mockWebpackConfig.plugins).toHaveLength(1);
            expect(mockWebpackConfig.plugins[0]).toEqual({
                pluginName: 'IgnorePlugin',
                config: { resourceRegExp: /^pg-native$|^cloudflare:sockets$/ },
            });
            expect(webpackResult).toBe(mockWebpackConfig);
        });
        it('should chain existing webpack configuration', () => {
            const existingWebpackPlugin = { name: 'ExistingPlugin' };
            const existingWebpack = jest.fn().mockImplementation((config) => {
                config.plugins.push(existingWebpackPlugin);
                return config;
            });
            const originalConfig = {
                webpack: existingWebpack,
            };
            const result = withIgnorePacks(originalConfig);
            const webpackResult = result.webpack(mockWebpackConfig, mockArgs);
            expect(existingWebpack).toHaveBeenCalledWith(mockWebpackConfig, mockArgs);
            expect(mockWebpackConfig.plugins).toHaveLength(2);
            expect(mockWebpackConfig.plugins[0]).toBe(existingWebpackPlugin);
            expect(mockWebpackConfig.plugins[1].pluginName).toBe('IgnorePlugin');
            expect(webpackResult).toBe(mockWebpackConfig);
        });
        it('should handle undefined existing webpack configuration', () => {
            const originalConfig = {};
            const result = withIgnorePacks(originalConfig);
            const webpackResult = result.webpack(mockWebpackConfig, mockArgs);
            expect(mockWebpackConfig.plugins).toHaveLength(1);
            expect(webpackResult).toBe(mockWebpackConfig);
        });
        it('should preserve type information', () => {
            const originalConfig = {
                customProperty: 'test',
                reactStrictMode: true,
            };
            const result = withIgnorePacks(originalConfig);
            expect(result.customProperty).toBe('test');
            expect(result.reactStrictMode).toBe(true);
        });
    });
    describe('StripRscPrefixPlugin and withStripRscPrefixPlugin', () => {
        let mockCompiler;
        let mockCompilation;
        beforeEach(() => {
            mockCompilation = {
                hooks: {
                    processAssets: {
                        tap: jest.fn((options, callback) => {
                            mockCompilation._processAssetsCallback = callback;
                        }),
                    },
                },
                updateAsset: jest.fn(),
            };
            mockCompiler = {
                hooks: {
                    compilation: {
                        tap: jest.fn((name, callback) => {
                            mockCompiler._compilationCallback = callback;
                        }),
                    },
                },
                webpack: {
                    Compilation: {
                        PROCESS_ASSETS_STAGE_DEV_TOOLING: 'dev-tooling',
                    },
                    sources: {
                        RawSource: jest.fn().mockImplementation((content) => ({
                            source: () => content,
                            content,
                        })),
                    },
                },
            };
        });
        describe('StripRscPrefixPlugin', () => {
            it('should register compilation and processAssets hooks', () => {
                StripRscPrefixPlugin.apply(mockCompiler);
                expect(mockCompiler.hooks.compilation.tap).toHaveBeenCalledWith('StripRscPrefixPlugin', expect.any(Function));
                mockCompiler._compilationCallback(mockCompilation);
                expect(mockCompilation.hooks.processAssets.tap).toHaveBeenCalledWith({
                    name: 'StripRscPrefixPlugin',
                    stage: 'dev-tooling',
                }, expect.any(Function));
            });
            it('should skip non-map files', () => {
                const assets = {
                    'main.js': { source: () => 'console.log("test");' },
                    'styles.css': { source: () => '.test { color: red; }' },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                mockCompilation._processAssetsCallback(assets);
                expect(mockCompilation.updateAsset).not.toHaveBeenCalled();
            });
            it('should skip map files without rsc/ssr prefixes', () => {
                const assets = {
                    'main.js.map': {
                        source: () => JSON.stringify({
                            sources: ['src/index.ts', 'lib/utils.ts'],
                            mappings: 'AAAA',
                        }),
                    },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                mockCompilation._processAssetsCallback(assets);
                expect(mockCompilation.updateAsset).not.toHaveBeenCalled();
            });
            it('should normalize rsc prefixes in source maps', () => {
                const sourceMap = {
                    sources: [
                        '/(rsc)/./lib/ai/middleware/chat-history/index.ts',
                        '/(rsc)/lib/components/chat.tsx',
                        '(rsc)/./src/utils.ts',
                        '/normal/path.ts',
                    ],
                    mappings: 'AAAA',
                };
                const assets = {
                    'server.js.map': {
                        source: () => JSON.stringify(sourceMap),
                    },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                mockCompilation._processAssetsCallback(assets);
                expect(mockCompilation.updateAsset).toHaveBeenCalledWith('server.js.map', expect.objectContaining({
                    content: JSON.stringify({
                        sources: [
                            '/lib/ai/middleware/chat-history/index.ts',
                            '/lib/components/chat.tsx',
                            '/src/utils.ts',
                            '/normal/path.ts',
                        ],
                        mappings: 'AAAA',
                    }),
                }));
                expect(mockCompiler.webpack.sources.RawSource).toHaveBeenCalledWith(JSON.stringify({
                    sources: [
                        '/lib/ai/middleware/chat-history/index.ts',
                        '/lib/components/chat.tsx',
                        '/src/utils.ts',
                        '/normal/path.ts',
                    ],
                    mappings: 'AAAA',
                }));
            });
            it('should normalize ssr prefixes in source maps', () => {
                const sourceMap = {
                    sources: [
                        '/(ssr)/./pages/index.tsx',
                        '(ssr)/lib/server-utils.ts',
                        '/normal/path.ts',
                    ],
                    mappings: 'BBBB',
                };
                const assets = {
                    'server.js.map': {
                        source: () => JSON.stringify(sourceMap),
                    },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                mockCompilation._processAssetsCallback(assets);
                expect(mockCompilation.updateAsset).toHaveBeenCalledWith('server.js.map', expect.objectContaining({
                    content: JSON.stringify({
                        sources: [
                            '/pages/index.tsx',
                            '/lib/server-utils.ts',
                            '/normal/path.ts',
                        ],
                        mappings: 'BBBB',
                    }),
                }));
            });
            it('should handle malformed JSON gracefully', () => {
                const assets = {
                    'broken.js.map': {
                        source: () => 'invalid json (rsc)',
                    },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                expect(() => {
                    mockCompilation._processAssetsCallback(assets);
                }).not.toThrow();
                expect(mockCompilation.updateAsset).not.toHaveBeenCalled();
            });
            it('should handle asset.source as function or property', () => {
                const sourceMapStr = JSON.stringify({
                    sources: ['/(rsc)/test.ts'],
                    mappings: 'AAAA',
                });
                const assets = {
                    'func.js.map': {
                        source: () => sourceMapStr,
                    },
                    'prop.js.map': {
                        source: sourceMapStr,
                    },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                mockCompilation._processAssetsCallback(assets);
                expect(mockCompilation.updateAsset).toHaveBeenCalledTimes(2);
                expect(mockCompilation.updateAsset).toHaveBeenNthCalledWith(1, 'func.js.map', expect.objectContaining({
                    content: JSON.stringify({
                        sources: ['/test.ts'],
                        mappings: 'AAAA',
                    }),
                }));
                expect(mockCompilation.updateAsset).toHaveBeenNthCalledWith(2, 'prop.js.map', expect.objectContaining({
                    content: JSON.stringify({
                        sources: ['/test.ts'],
                        mappings: 'AAAA',
                    }),
                }));
            });
            it('should handle multiple slashes correctly', () => {
                const sourceMap = {
                    sources: ['/(rsc)/./././lib/test.ts', '/(rsc)///lib/test2.ts'],
                    mappings: 'AAAA',
                };
                const assets = {
                    'test.js.map': {
                        source: () => JSON.stringify(sourceMap),
                    },
                };
                StripRscPrefixPlugin.apply(mockCompiler);
                mockCompiler._compilationCallback(mockCompilation);
                mockCompilation._processAssetsCallback(assets);
                const actualCall = mockCompilation.updateAsset.mock.calls[0];
                const actualContent = JSON.parse(actualCall[1].content);
                expect(actualContent.sources[0]).toMatch(/^\/.*lib\/test\.ts$/);
                expect(actualContent.sources[1]).toMatch(/^\/.*lib\/test2\.ts$/);
                expect(actualContent.mappings).toBe('AAAA');
            });
        });
        describe('withStripRscPrefixPlugin', () => {
            it('should preserve existing Next.js configuration', () => {
                const originalConfig = {
                    reactStrictMode: true,
                    env: { TEST: 'value' },
                };
                const result = withStripRscPrefixPlugin(originalConfig);
                expect(result.reactStrictMode).toBe(true);
                expect(result.env).toEqual({ TEST: 'value' });
            });
            it('should add StripRscPrefixPlugin to webpack configuration', () => {
                const originalConfig = {};
                const result = withStripRscPrefixPlugin(originalConfig);
                expect(result.webpack).toBeDefined();
                expect(typeof result.webpack).toBe('function');
                const mockWebpackConfig = { plugins: [] };
                const mockArgs = { webpack: mockCompiler.webpack };
                result.webpack(mockWebpackConfig, mockArgs);
                expect(mockWebpackConfig.plugins).toHaveLength(1);
                expect(mockWebpackConfig.plugins[0]).toBe(StripRscPrefixPlugin);
            });
            it('should chain existing webpack configuration', () => {
                const existingPlugin = { name: 'ExistingPlugin' };
                const existingWebpack = jest.fn().mockImplementation((config) => {
                    config.plugins.push(existingPlugin);
                    return config;
                });
                const originalConfig = {
                    webpack: existingWebpack,
                };
                const result = withStripRscPrefixPlugin(originalConfig);
                const mockWebpackConfig = { plugins: [] };
                const mockArgs = { webpack: mockCompiler.webpack };
                result.webpack(mockWebpackConfig, mockArgs);
                expect(existingWebpack).toHaveBeenCalledWith(mockWebpackConfig, mockArgs);
                expect(mockWebpackConfig.plugins).toHaveLength(2);
                expect(mockWebpackConfig.plugins[0]).toBe(existingPlugin);
                expect(mockWebpackConfig.plugins[1]).toBe(StripRscPrefixPlugin);
            });
        });
    });
    describe('withBundleAnalyzer', () => {
        const originalEnv = process.env.ANALYZE;
        beforeEach(() => {
        });
        afterEach(() => {
            if (originalEnv !== undefined) {
                process.env.ANALYZE = originalEnv;
            }
            else {
                delete process.env.ANALYZE;
            }
        });
        it('should return original config when ANALYZE is not set', () => {
            const originalConfig = {
                reactStrictMode: true,
                env: { TEST: 'value' },
            };
            const result = withBundleAnalyzer(originalConfig);
            expect(result).toBe(originalConfig);
        });
        it('should return original config when ANALYZE is false', () => {
            process.env.ANALYZE = 'false';
            const originalConfig = {
                reactStrictMode: true,
            };
            const result = withBundleAnalyzer(originalConfig);
            expect(result).toBe(originalConfig);
        });
        it('should return original config when ANALYZE is empty string', () => {
            process.env.ANALYZE = '';
            const originalConfig = {
                reactStrictMode: true,
            };
            const result = withBundleAnalyzer(originalConfig);
            expect(result).toBe(originalConfig);
        });
        it('should apply bundle analyzer when ANALYZE is true', () => {
            process.env.ANALYZE = 'true';
            const originalConfig = {
                reactStrictMode: true,
            };
            const mockBundleAnalyzer = jest
                .fn()
                .mockImplementation((options) => (config) => ({
                ...config,
                _bundleAnalyzer: options,
            }));
            jest.doMock('@next/bundle-analyzer', () => mockBundleAnalyzer, {
                virtual: true,
            });
            jest.resetModules();
            const { withBundleAnalyzer: FreshWithBundleAnalyzer, } = require('/lib/config/bundle-analyzers');
            const result = FreshWithBundleAnalyzer(originalConfig);
            expect(mockBundleAnalyzer).toHaveBeenCalledWith({
                enabled: true,
                openAnalyzer: false,
            });
            expect(result).toEqual({
                reactStrictMode: true,
                _bundleAnalyzer: {
                    enabled: true,
                    openAnalyzer: false,
                },
            });
            jest.dontMock('@next/bundle-analyzer');
        });
        it('should preserve type information', () => {
            process.env.ANALYZE = 'false';
            const originalConfig = {
                customProperty: 'test',
                reactStrictMode: true,
            };
            const result = withBundleAnalyzer(originalConfig);
            expect(result.customProperty).toBe('test');
            expect(result.reactStrictMode).toBe(true);
        });
    });
    describe('integration tests', () => {
        it('should work when all config functions are chained together', () => {
            const baseConfig = {
                reactStrictMode: true,
                experimental: {
                    serverComponentsExternalPackages: ['test-package'],
                },
            };
            const result = withBundleAnalyzer(withStripRscPrefixPlugin(withIgnorePacks(baseConfig)));
            expect(result.reactStrictMode).toBe(true);
            expect(result.webpack).toBeDefined();
            expect(typeof result.webpack).toBe('function');
            expect(result).not.toHaveProperty('_bundleAnalyzer');
        });
        it('should maintain type safety across chained functions', () => {
            const baseConfig = {
                customProperty: 'test',
                customObject: { nested: true },
                reactStrictMode: true,
            };
            const result = withIgnorePacks(baseConfig);
            expect(result.customProperty).toBe('test');
            expect(result.customObject).toEqual({ nested: true });
            expect(result.reactStrictMode).toBe(true);
        });
    });
    describe('withTypescriptConfig', () => {
        it('should preserve existing Next.js configuration', () => {
            const originalConfig = {
                reactStrictMode: true,
                env: { TEST: 'value' },
                experimental: {
                    serverComponentsExternalPackages: ['test-package'],
                },
            };
            const result = withTypescriptConfig(originalConfig);
            expect(result.reactStrictMode).toBe(true);
            expect(result.env).toEqual({ TEST: 'value' });
            expect(result.experimental).toEqual({
                serverComponentsExternalPackages: ['test-package'],
            });
        });
        it('should return a new config object (not mutate original)', () => {
            const originalConfig = {
                reactStrictMode: true,
            };
            const result = withTypescriptConfig(originalConfig);
            expect(result).not.toBe(originalConfig);
            expect(result.reactStrictMode).toBe(true);
        });
        it('should handle empty config', () => {
            const originalConfig = {};
            const result = withTypescriptConfig(originalConfig);
            expect(result).toBeDefined();
            expect(result).not.toBe(originalConfig);
        });
        it('should preserve all existing properties', () => {
            const originalConfig = {
                reactStrictMode: true,
                poweredByHeader: true,
                compress: false,
                generateEtags: false,
                pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
                webpack: (config) => config,
                env: { CUSTOM: 'value' },
            };
            const result = withTypescriptConfig(originalConfig);
            expect(result.reactStrictMode).toBe(true);
            expect(result.poweredByHeader).toBe(true);
            expect(result.compress).toBe(false);
            expect(result.generateEtags).toBe(false);
            expect(result.pageExtensions).toEqual(['tsx', 'ts', 'jsx', 'js']);
            expect(result.webpack).toBeDefined();
            expect(result.env).toEqual({ CUSTOM: 'value' });
        });
        it('should preserve type information', () => {
            const originalConfig = {
                customProperty: 'test',
                reactStrictMode: true,
            };
            const result = withTypescriptConfig(originalConfig);
            expect(result.customProperty).toBe('test');
            expect(result.reactStrictMode).toBe(true);
        });
    });
    describe('withReactConfig', () => {
        it('should set default React configuration', () => {
            const originalConfig = {};
            const result = withReactConfig(originalConfig);
            expect(result.poweredByHeader).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(true);
            expect(result.reactStrictMode).toBe(true);
            expect(result.experimental?.reactCompiler).toBe(true);
        });
        it('should preserve existing Next.js configuration', () => {
            const originalConfig = {
                env: { TEST: 'value' },
                compress: false,
            };
            const result = withReactConfig(originalConfig);
            expect(result.env).toEqual({ TEST: 'value' });
            expect(result.compress).toBe(false);
            expect(result.reactStrictMode).toBe(true);
        });
        it('should merge with existing experimental config', () => {
            const originalConfig = {
                experimental: {
                    serverComponentsExternalPackages: ['test-package'],
                    typedRoutes: true,
                },
            };
            const result = withReactConfig(originalConfig);
            expect(result.experimental).toEqual({
                serverComponentsExternalPackages: ['test-package'],
                typedRoutes: true,
                reactCompiler: true,
            });
        });
        it('should override poweredByHeader even if set in original config', () => {
            const originalConfig = {
                poweredByHeader: true,
            };
            const result = withReactConfig(originalConfig);
            expect(result.poweredByHeader).toBe(false);
        });
        it('should enable production browser source maps by default', () => {
            const originalConfig = {};
            const result = withReactConfig(originalConfig);
            expect(result.productionBrowserSourceMaps).toBe(true);
        });
        it('should preserve type information', () => {
            const originalConfig = {
                customProperty: 'test',
                reactStrictMode: false,
            };
            const result = withReactConfig(originalConfig);
            expect(result.customProperty).toBe('test');
            expect(result.reactStrictMode).toBe(true);
        });
    });
    describe('withReactConfigFactory', () => {
        it('should create a config function with default options', () => {
            const configFn = withReactConfigFactory();
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.poweredByHeader).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(true);
            expect(result.reactStrictMode).toBe(true);
            expect(result.experimental?.reactCompiler).toBe(true);
        });
        it('should respect reactCompiler option when set to false', () => {
            const configFn = withReactConfigFactory({ reactCompiler: false });
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.experimental?.reactCompiler).toBe(false);
        });
        it('should respect reactCompiler option when set to true', () => {
            const configFn = withReactConfigFactory({ reactCompiler: true });
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.experimental?.reactCompiler).toBe(true);
        });
        it('should respect disableSourceMaps option when set to true', () => {
            const configFn = withReactConfigFactory({ disableSourceMaps: true });
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.productionBrowserSourceMaps).toBe(false);
        });
        it('should respect disableSourceMaps option when set to false', () => {
            const configFn = withReactConfigFactory({ disableSourceMaps: false });
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.productionBrowserSourceMaps).toBe(true);
        });
        it('should handle both options together', () => {
            const configFn = withReactConfigFactory({
                reactCompiler: false,
                disableSourceMaps: true,
            });
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.experimental?.reactCompiler).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(false);
            expect(result.reactStrictMode).toBe(true);
            expect(result.poweredByHeader).toBe(false);
        });
        it('should preserve existing experimental config when disabling compiler', () => {
            const configFn = withReactConfigFactory({ reactCompiler: false });
            const originalConfig = {
                experimental: {
                    serverComponentsExternalPackages: ['test-package'],
                },
            };
            const result = configFn(originalConfig);
            expect(result.experimental).toEqual({
                serverComponentsExternalPackages: ['test-package'],
                reactCompiler: false,
            });
        });
        it('should handle empty options object', () => {
            const configFn = withReactConfigFactory({});
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.poweredByHeader).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(true);
            expect(result.reactStrictMode).toBe(true);
            expect(result.experimental?.reactCompiler).toBe(true);
        });
        it('should handle partial options', () => {
            const configFn = withReactConfigFactory({ reactCompiler: false });
            const originalConfig = {};
            const result = configFn(originalConfig);
            expect(result.experimental?.reactCompiler).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(true);
        });
        it('should create different functions with different options', () => {
            const configFn1 = withReactConfigFactory({ reactCompiler: true });
            const configFn2 = withReactConfigFactory({ reactCompiler: false });
            const originalConfig = {};
            const result1 = configFn1(originalConfig);
            const result2 = configFn2(originalConfig);
            expect(result1.experimental?.reactCompiler).toBe(true);
            expect(result2.experimental?.reactCompiler).toBe(false);
        });
        it('should preserve type information', () => {
            const configFn = withReactConfigFactory({ reactCompiler: false });
            const originalConfig = {
                customProperty: 'test',
            };
            const result = configFn(originalConfig);
            expect(result.customProperty).toBe('test');
            expect(result.experimental?.reactCompiler).toBe(false);
        });
    });
    describe('integration: typescript + react configs', () => {
        it('should work when both configs are chained', () => {
            const baseConfig = {
                env: { TEST: 'value' },
            };
            const result = withReactConfig(withTypescriptConfig(baseConfig));
            expect(result.env).toEqual({ TEST: 'value' });
            expect(result.reactStrictMode).toBe(true);
            expect(result.poweredByHeader).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(true);
            expect(result.experimental?.reactCompiler).toBe(true);
        });
        it('should work with all configs chained together', () => {
            const baseConfig = {
                env: { TEST: 'value' },
            };
            const result = withReactConfig(withTypescriptConfig(withStripRscPrefixPlugin(withIgnorePacks(baseConfig))));
            expect(result.env).toEqual({ TEST: 'value' });
            expect(result.reactStrictMode).toBe(true);
            expect(result.poweredByHeader).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(true);
            expect(result.experimental?.reactCompiler).toBe(true);
            expect(result.webpack).toBeDefined();
        });
        it('should work with custom react config factory in chain', () => {
            const baseConfig = {};
            const customReactConfig = withReactConfigFactory({
                reactCompiler: false,
                disableSourceMaps: true,
            });
            const result = customReactConfig(withTypescriptConfig(baseConfig));
            expect(result.reactStrictMode).toBe(true);
            expect(result.poweredByHeader).toBe(false);
            expect(result.productionBrowserSourceMaps).toBe(false);
            expect(result.experimental?.reactCompiler).toBe(false);
        });
    });
});
//# sourceMappingURL=index.test.js.map