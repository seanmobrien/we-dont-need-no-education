import { SingletonProvider } from '@compliance-theater/typescript';
import { AllFeatureFlagsDefault } from '@/lib/site-util/feature-flags/known-feature-defaults';
const NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID = 'test-environment-id';
const NEXT_PUBLIC_FLAGSMITH_API_URL = 'https://api.flagsmith.notadomain.net/api/v1/';
export const mockFlagsmithInstanceFactory = ({ initialized = false, identifier = null, traits = null, flags = {}, cacheOptions = { ttl: 1000, skipAPI: false, loadStale: false }, apiUrl = NEXT_PUBLIC_FLAGSMITH_API_URL, environmentId = NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID, loadingState = 'loading', } = {}) => {
    let thisInitialized = initialized;
    let thisIdentifier = identifier;
    let thisTraits = traits;
    let thisFlags = flags;
    let thisCacheOptions = cacheOptions;
    let thisApiUrl = apiUrl;
    let thisEnvironmentId = environmentId;
    let thisLoadingState = loadingState;
    const mockThis = {
        get init() {
            return jest.fn((options) => {
                thisInitialized = true;
                thisEnvironmentId = options?.environmentID || thisEnvironmentId;
                thisApiUrl = options?.api || thisApiUrl;
                thisLoadingState = 'loaded';
                return Promise.resolve();
            });
        },
        get initialised() {
            return jest.fn(() => thisInitialized);
        },
        get loadingState() {
            return jest.fn(() => thisLoadingState);
        },
        get getFlags() {
            return jest.fn(() => Object.keys(thisFlags));
        },
        get getAllFlags() {
            return jest.fn(() => thisFlags);
        },
        get hasFeature() {
            return jest.fn((key) => Boolean(thisFlags[key]));
        },
        get getValue() {
            return jest.fn((key) => thisFlags[key]);
        },
        get identify() {
            return jest.fn((userId, traits) => {
                thisIdentifier = userId;
                thisTraits = traits ?? null;
                return Promise.resolve();
            });
        },
        get identity() {
            return jest.fn(() => thisIdentifier);
        },
        get getTrait() {
            return jest.fn((key) => thisTraits?.[key]);
        },
        get getAllTraits() {
            return jest.fn(() => thisTraits);
        },
        get setTrait() {
            return jest.fn((key, value) => {
                thisTraits = { ...(thisTraits ?? {}), [key]: value };
                return Promise.resolve();
            });
        },
        get setTraits() {
            return jest.fn((traits) => {
                thisTraits = {
                    ...(thisTraits ?? {}),
                    ...traits,
                };
                return Promise.resolve();
            });
        },
        get setContext() {
            return jest.fn((context) => {
                if (context?.identity)
                    thisIdentifier = context.identity;
                if (context?.traits)
                    thisTraits = context.traits;
                return Promise.resolve();
            });
        },
        get updateContext() {
            return jest.fn((context) => {
                if (context?.traits) {
                    thisTraits = { ...(thisTraits ?? {}), ...context.traits };
                }
                return Promise.resolve();
            });
        },
        get getContext() {
            return jest.fn(() => ({
                identity: thisIdentifier,
                traits: thisTraits,
            }));
        },
        get getState() {
            return jest.fn(() => ({
                flags: thisFlags,
                identity: thisIdentifier,
                traits: thisTraits,
                initialized: thisInitialized,
                loadingState: thisLoadingState,
            }));
        },
        get setState() {
            return jest.fn((state) => {
                if (state?.flags)
                    thisFlags = state.flags;
                if (state?.identity)
                    thisIdentifier = state.identity;
                if (state?.traits)
                    thisTraits = state.traits;
                if (state?.initialized !== undefined)
                    thisInitialized = state.initialized;
                if (state?.loadingState)
                    thisLoadingState = state.loadingState;
            });
        },
        get logout() {
            return jest.fn(() => {
                thisIdentifier = null;
                thisTraits = null;
                thisFlags = {};
                return Promise.resolve();
            });
        },
        get startListening() {
            return jest.fn((ttl) => {
                thisCacheOptions = {
                    ...thisCacheOptions,
                    ttl: ttl ?? thisCacheOptions.ttl,
                };
            });
        },
        get stopListening() {
            return jest.fn(() => {
            });
        },
        get _trigger() {
            return jest.fn();
        },
        get _triggerLoadingState() {
            return jest.fn((state) => {
                thisLoadingState = state;
            });
        },
        get cacheOptions() {
            return {
                get: jest.fn(() => thisCacheOptions),
            };
        },
        get api() {
            return {
                get: jest.fn(() => thisApiUrl),
            };
        },
    };
    return mockThis;
};
let mockFlagsmithInstance = null;
jest.mock('flagsmith/react', () => {
    let loadingState = jest.fn(() => ({
        isLoading: false,
        error: null,
        isFetching: false,
    }))();
    return {
        __esModule: true,
        FlagsmithProvider: ({ children }) => children,
        useFlagsmith: jest.fn(() => {
            mockFlagsmithInstance =
                mockFlagsmithInstance ?? mockFlagsmithInstanceFactory();
            return mockFlagsmithInstance;
        }),
        useFlagsmithLoading: jest.fn(() => loadingState),
    };
});
jest.mock('flagsmith/isomorphic', () => ({
    __esModule: true,
    createFlagsmithInstance: jest.fn(() => {
        mockFlagsmithInstance =
            mockFlagsmithInstance ?? mockFlagsmithInstanceFactory();
        return mockFlagsmithInstance;
    }),
}));
jest.mock('flagsmith-nodejs', () => {
    return {
        __esModule: true,
        Flagsmith: jest.fn().mockImplementation(() => {
            const mockFlags = {
                getFeatureValue: jest.fn((key) => {
                    return (AllFeatureFlagsDefault[key] ?? false);
                }),
                isFeatureEnabled: jest.fn(() => false),
                getAllFlags: jest.fn(() => ({})),
                getFlag: jest.fn((flag) => {
                    const ret = AllFeatureFlagsDefault[flag] ?? null;
                    if (!ret) {
                        return {
                            enabled: false,
                            value: undefined,
                        };
                    }
                    return {
                        enabled: true,
                        value: typeof ret === 'object' ? JSON.stringify(ret) : ret,
                    };
                }),
            };
            return {
                getIdentityFlags: jest.fn(() => Promise.resolve(mockFlags)),
                getEnvironmentFlags: jest.fn(() => Promise.resolve(mockFlags)),
            };
        }),
        Flags: jest.fn(),
    };
});
const createAutoRefreshFlagImpl = (options) => {
    mockFlagsmithInstance =
        mockFlagsmithInstance ?? mockFlagsmithInstanceFactory();
    return {
        key: options.key,
        userId: options.userId ?? 'server',
        initialValue: options.initialValue ??
            mockFlagsmithInstance.getValue(options.key) ??
            false,
        load: options.load ?? true,
    };
};
jest.mock('@/lib/site-util/feature-flags', () => {
    const originalModule = jest.requireActual('@/lib/site-util/feature-flags');
    return {
        __esModule: true,
        ...originalModule,
        createAutoRefreshFeatureFlag: jest.fn((options) => {
            return Promise.resolve(createAutoRefreshFlagImpl(options));
        }),
        createAutoRefreshFeatureFlagSync: jest.fn((options) => {
            return createAutoRefreshFlagImpl(options);
        }),
    };
});
jest.mock('@/lib/site-util/feature-flags/feature-flag-with-refresh', () => {
    const originalModule = jest.requireActual('@/lib/site-util/feature-flags/feature-flag-with-refresh');
    return {
        __esModule: true,
        ...originalModule,
        createAutoRefreshFeatureFlag: jest.fn((options) => {
            return Promise.resolve(createAutoRefreshFlagImpl(options));
        }),
        createAutoRefreshFeatureFlagSync: jest.fn((options) => {
            return createAutoRefreshFlagImpl(options);
        }),
        wellKnownFlag: jest.fn(originalModule.wellKnownFlag),
        wellKnownFlagSync: jest.fn(originalModule.wellKnownFlagSync),
    };
});
afterEach(() => {
    const CACHE_ENABLED_FLAG_KEY = Symbol.for('@noeducation/mcp/cache/tool-cache-enabled-flag');
    SingletonProvider.Instance.delete(CACHE_ENABLED_FLAG_KEY);
});
//# sourceMappingURL=jest.mock-feature-flags.js.map