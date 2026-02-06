import { SingletonProvider } from '@compliance-theater/typescript';
import { AllFeatureFlagsDefault } from '@/lib/site-util/feature-flags/known-feature-defaults';

const NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID = 'test-environment-id';
const NEXT_PUBLIC_FLAGSMITH_API_URL =
  'https://api.flagsmith.notadomain.net/api/v1/';

type AutoRefreshFeatureFlagOptions = {
  key: string;
  userId?: string | 'server';
  initialValue?: any;
  ttl?: number;
  load?: boolean;
};

// NOTE: I think there are some differences between what this returns and what we see
// in live...
export const mockFlagsmithInstanceFactory = ({
  initialized = false,
  identifier = null,
  traits = null,
  flags = {},
  cacheOptions = { ttl: 1000, skipAPI: false, loadStale: false },
  apiUrl = NEXT_PUBLIC_FLAGSMITH_API_URL,
  environmentId = NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID,
  loadingState = 'loading',
}: {
  initialized?: boolean;
  identifier?: string | null;
  traits?: Record<string, string> | null;
  flags?: Record<string, string | number | boolean>;
  cacheOptions?: { ttl: number; skipAPI: boolean; loadStale: boolean };
  apiUrl?: string;
  environmentId?: string;
  loadingState?: string;
} = {}) => {
  // Local state management with configurable defaults
  let thisInitialized = initialized;
  let thisIdentifier: string | null = identifier;
  let thisTraits: null | Record<string, string> = traits;
  let thisFlags: Record<string, string | number | boolean> = flags;
  let thisCacheOptions = cacheOptions;
  let thisApiUrl = apiUrl;
  let thisEnvironmentId = environmentId;
  let thisLoadingState = loadingState;

  // Create jest.fn property getters for all IFlagsmith fields
  const mockThis = {
    // Core initialization and state
    get init() {
      return jest.fn((options?: { environmentID?: string; api?: string }) => {
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

    // Flag operations
    get getFlags() {
      return jest.fn(() => Object.keys(thisFlags));
    },
    get getAllFlags() {
      return jest.fn(() => thisFlags);
    },
    get hasFeature() {
      return jest.fn((key: string) => Boolean(thisFlags[key]));
    },
    get getValue() {
      return jest.fn((key: string) => thisFlags[key]);
    },

    // Identity and traits
    get identify() {
      return jest.fn((userId: string, traits?: Record<string, string>) => {
        thisIdentifier = userId;
        thisTraits = traits ?? null;
        return Promise.resolve();
      });
    },

    get identity() {
      return jest.fn(() => thisIdentifier);
    },

    get getTrait() {
      return jest.fn((key: string) => thisTraits?.[key]);
    },
    get getAllTraits() {
      return jest.fn(() => thisTraits);
    },
    get setTrait() {
      return jest.fn((key: string, value: string) => {
        thisTraits = { ...(thisTraits ?? {}), [key]: value };
        return Promise.resolve();
      });
    },
    get setTraits() {
      return jest.fn((traits: any) => {
        thisTraits = {
          ...(thisTraits ?? {}),
          ...(traits as Record<string, string>),
        };
        return Promise.resolve();
      });
    },

    // Context management
    get setContext() {
      return jest.fn(
        (context: { identity?: string; traits?: Record<string, string> }) => {
          if (context?.identity) thisIdentifier = context.identity;
          if (context?.traits) thisTraits = context.traits;
          return Promise.resolve();
        }
      );
    },
    get updateContext() {
      return jest.fn((context: { traits?: Record<string, string> }) => {
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

    // State management
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
      return jest.fn(
        (state: {
          flags?: Record<string, string | number | boolean>;
          identity?: string;
          traits?: Record<string, string>;
          initialized?: boolean;
          loadingState?: string;
        }) => {
          if (state?.flags) thisFlags = state.flags;
          if (state?.identity) thisIdentifier = state.identity;
          if (state?.traits) thisTraits = state.traits;
          if (state?.initialized !== undefined)
            thisInitialized = state.initialized;
          if (state?.loadingState) thisLoadingState = state.loadingState;
        }
      );
    },

    // Session management
    get logout() {
      return jest.fn(() => {
        thisIdentifier = null;
        thisTraits = null;
        thisFlags = {};
        return Promise.resolve();
      });
    },

    // Event listening
    get startListening() {
      return jest.fn((ttl?: number) => {
        thisCacheOptions = {
          ...thisCacheOptions,
          ttl: ttl ?? thisCacheOptions.ttl,
        };
      });
    },
    get stopListening() {
      return jest.fn(() => {
        // No-op for mock
      });
    },

    // Internal methods
    get _trigger() {
      return jest.fn();
    },
    get _triggerLoadingState() {
      return jest.fn((state: string) => {
        thisLoadingState = state;
      });
    },

    // Configuration
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

let mockFlagsmithInstance: ReturnType<
  typeof mockFlagsmithInstanceFactory
> | null = null;

jest.mock('flagsmith/react', () => {
  let loadingState = jest.fn(() => ({
    isLoading: false,
    error: null,
    isFetching: false,
  }))();

  return {
    __esModule: true,
    FlagsmithProvider: ({ children }: { children: unknown }) => children,
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

// Mock flagsmith-nodejs for server-side feature flags
jest.mock('flagsmith-nodejs', () => {
  return {
    __esModule: true,
    Flagsmith: jest.fn().mockImplementation(() => {
      const mockFlags = {
        getFeatureValue: jest.fn((key: string) => {
          return (
            AllFeatureFlagsDefault[
              key as keyof typeof AllFeatureFlagsDefault
            ] ?? false
          );
        }),
        isFeatureEnabled: jest.fn(() => false),
        getAllFlags: jest.fn(() => ({})),
        getFlag: jest.fn((flag: string) => {
          const ret =
            AllFeatureFlagsDefault[
              flag as keyof typeof AllFeatureFlagsDefault
            ] ?? null;
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

const createAutoRefreshFlagImpl = (options: AutoRefreshFeatureFlagOptions) => {
  mockFlagsmithInstance =
    mockFlagsmithInstance ?? mockFlagsmithInstanceFactory();
  return {
    key: options.key,
    userId: options.userId ?? 'server',
    initialValue:
      options.initialValue ??
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
    createAutoRefreshFeatureFlag: jest.fn(
      (options: AutoRefreshFeatureFlagOptions) => {
        return Promise.resolve(createAutoRefreshFlagImpl(options));
      }
    ),
    createAutoRefreshFeatureFlagSync: jest.fn(
      (options: AutoRefreshFeatureFlagOptions) => {
        return createAutoRefreshFlagImpl(options);
      }
    ),
  };
});
jest.mock('@/lib/site-util/feature-flags/feature-flag-with-refresh', () => {
  const originalModule = jest.requireActual(
    '@/lib/site-util/feature-flags/feature-flag-with-refresh'
  );
  return {
    __esModule: true,
    ...originalModule,
    createAutoRefreshFeatureFlag: jest.fn(
      (options: AutoRefreshFeatureFlagOptions) => {
        return Promise.resolve(createAutoRefreshFlagImpl(options));
      }
    ),
    createAutoRefreshFeatureFlagSync: jest.fn(
      (options: AutoRefreshFeatureFlagOptions) => {
        return createAutoRefreshFlagImpl(options);
      }
    ),
    wellKnownFlag: jest.fn(originalModule.wellKnownFlag),
    wellKnownFlagSync: jest.fn(originalModule.wellKnownFlagSync),
  };
});

import {
  useFlagsmith,
  FlagsmithProvider,
  useFlagsmithLoading,
} from 'flagsmith/react';
import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import {
  createAutoRefreshFeatureFlag,
  createAutoRefreshFeatureFlagSync,
  wellKnownFlag,
  wellKnownFlagSync,
} from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import { en } from 'zod/v4/locales';

afterEach(() => {
  const CACHE_ENABLED_FLAG_KEY = Symbol.for(
    '@noeducation/mcp/cache/tool-cache-enabled-flag'
  );
  SingletonProvider.Instance.delete(CACHE_ENABLED_FLAG_KEY);
});
