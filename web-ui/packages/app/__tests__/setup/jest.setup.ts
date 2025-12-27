process.env.MEM0_API_BASE_PATH = process.env.MEM0_API_BASE_PATH ?? 'api/v1';

jest.mock('@/lib/nextjs-util/client-navigate', () => ({
  clientReload: jest.fn().mockImplementation(() => { }),
  clientNavigate: jest.fn().mockImplementation(() => { }),
  clientNavigateSignIn: jest.fn().mockImplementation(() => { }),
}));

jest.mock('@/lib/hooks/use-todo', () => ({
  useTodoLists: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useTodoList: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useToggleTodo: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useCreateTodoList: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useUpdateTodoList: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeleteTodoList: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useCreateTodoItem: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useUpdateTodoItem: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeleteTodoItem: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/instrument/browser', () => ({
  getReactPlugin: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  })),
  getClickPlugin: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  })),
  getAppInsights: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  })),
  instrument: jest.fn(),
}));

// Mock window.matchMedia for @textea/json-viewer compatibility (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

import dotenv from 'dotenv';

jest.mock('@repo/lib-site-util-env', () => {
  return {
    env: jest.fn((key: string) => {
      return process.env[key] || '';
    }),
    isRunningOnServer: jest.fn(() => typeof window === 'undefined'),
    isRunningOnEdge: jest.fn(() => false),
  };
});

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { sendApiRequest } from '@/lib/send-api-request';

import 'jest';
import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
import { mock } from 'jest-mock-extended';
import { zerialize } from 'zodex';
import { FormatAlignCenterSharp } from '@mui/icons-material';
import { createElement } from 'react';
import { TrackWithAppInsight } from '@/components/general/telemetry/track-with-app-insight';
import instrument, { getAppInsights } from '@/instrument/browser';
import { log } from '@/lib/logger';
import {
  FirstParameter,
  isKeyOf,
  isPromise,
  SingletonProvider,
} from '@/lib/typescript';
import { result, xorBy } from 'lodash';

import { ITraits } from 'flagsmith/react';
import { P } from 'ts-pattern';
import { LoggedError } from '@/lib/react-util/errors/logged-error/logged-error-class';
import { ErrorReportArgs } from '@/lib/react-util/errors/logged-error/types';
import { ErrorReporterInterface } from '@/lib/error-monitoring/types';
globalThis.TextEncoder = TextEncoder as any;
globalThis.TextDecoder = TextDecoder as any;

// Ensure WHATWG Streams exist in Jest (jsdom)
(() => {
  try {
    if (typeof (globalThis as any).TransformStream === 'undefined') {
      // Prefer Node's built-in streams if available

      const web = require('stream/web');
      if (web?.TransformStream) {
        (globalThis as any).TransformStream = web.TransformStream;
        (globalThis as any).ReadableStream ||= web.ReadableStream;
        (globalThis as any).WritableStream ||= web.WritableStream;
        return;
      }
    }
  } catch {
    // fall through to ponyfill
  }
  // Fallback ponyfill

  const ponyfill = require('web-streams-polyfill');
  (globalThis as any).TransformStream ||= ponyfill.TransformStream;
  (globalThis as any).ReadableStream ||= ponyfill.ReadableStream;
  (globalThis as any).WritableStream ||= ponyfill.WritableStream;
})();

// Automocks

const Zodex = require('zodex').Zodex;

let originalProcessEnv = (() => {
  try {
    const origConfig = dotenv.parse(
      require('fs').readFileSync('.env.local', { encoding: 'utf-8' }),
    );
    return {
      REDIS_URL: origConfig.REDIS_URL,
      REDIS_PASSWORD: origConfig.REDIS_PASSWORD,
    };
  } catch (error) {
    return {};
  }
})();
// Redis settings require  original env vars for integrtation tests
export const withRedisConnection = () => {
  process.env.REDIS_URL =
    originalProcessEnv.REDIS_URL || 'redis://test-redis.local:6379';
  if (process.env.REDIS_URL.includes('test-redis.local')) {
    // NOTE: noop, but this is clearly not an integration test
  }
  process.env.REDIS_PASSWORD =
    originalProcessEnv.REDIS_PASSWORD || 'test-redis-password';
  if (process.env.REDIS_PASSWORD.includes('test-redis-password')) {
    // NOTE: noop, but this is clearly not an integration test        
  }
};

globalThis.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ response: 'error' }),
  });
});

export const mockFlagsmithInstanceFactory = ({
  initialized = false,
  identifier = null,
  traits = null,
  flags = {},
  cacheOptions = { ttl: 1000, skipAPI: false, loadStale: false },
  apiUrl = process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
  environmentId = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID,
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
      return jest.fn((traits: ITraits) => {
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
        },
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
        },
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

// lets make this a little simpler and just register a direct listener instead
// of trying to route it through a mocked reporter
const reportErrorToConsole = (report: ErrorReportArgs) => {
  try {
    if (typeof console.group === 'function') {
      console.group(`🐛 Mock Error Report`);
    }
    if (typeof console.error === 'function') {
      console.error('Error:', report?.error ?? report);
    }
    if (typeof console.table === 'function') {
      console.table(report?.context ?? {});
    }
  } finally {
    if (typeof console.groupEnd === 'function') {
      console.groupEnd();
    }
  }
};
const onLoggedErrorEmitted = ({ error, context }: ErrorReportArgs) =>
  reportErrorToConsole({ error, context });

beforeAll(() => {
  try {
    const origConfig = dotenv.parse(
      require('fs').readFileSync('.env.local', { encoding: 'utf-8' }),
    );
    originalProcessEnv = {
      REDIS_URL: origConfig.REDIS_URL,
      REDIS_PASSWORD: origConfig.REDIS_PASSWORD,
    };
  } catch (error) {
    return {};
  }
});

jest.mock('@/lib/react-util/errors/logged-error-reporter', () => {
  return {
    reporter: jest.fn(() =>
      Promise.resolve({
        subscribeToErrorReports: jest.fn(),
        unsubscribeFromErrorReports: jest.fn(),
        reportError: jest.fn().mockImplementation(async (_report: any) => {
          // emulate console logging behavior of the real reporter so tests
          // that spy on console.group / console.error can observe it
          reportErrorToConsole(_report);
          return Promise.resolve(undefined);
        }),
        reportBoundaryError: jest.fn().mockResolvedValue(undefined),
        reportUnhandledRejection: jest.fn().mockResolvedValue(undefined),
        setupGlobalHandlers: jest.fn(),
        getStoredErrors: jest.fn(() => []),
        clearStoredErrors: jest.fn(),
      }),
    ),
  };
});


beforeEach(() => {
  // Wire up a super-simple rudimentary error logger
  LoggedError.subscribeToErrorReports(onLoggedErrorEmitted);
});

afterEach(() => {
  // Unsubscribe from error reports
  LoggedError.unsubscribeFromErrorReports(onLoggedErrorEmitted);
  // Magic token to reset zerialize cache
  Zodex.zerialize('__$$__reset__$$__');
  // Restore natural timers and clear mocks
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
  // Reset all the singletons attached to global state
  SingletonProvider.Instance.clear();
});
