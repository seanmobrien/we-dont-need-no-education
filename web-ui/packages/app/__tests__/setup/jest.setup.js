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
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}
import dotenv from 'dotenv';
jest.mock('@compliance-theater/env', () => {
    return {
        env: jest.fn((key) => {
            return process.env[key] || '';
        }),
        isRunningOnServer: jest.fn(() => typeof window === 'undefined'),
        isRunningOnEdge: jest.fn(() => false),
    };
});
import 'jest';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { SingletonProvider, } from '@compliance-theater/typescript';
import { LoggedError } from '@compliance-theater/logger';
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
(() => {
    try {
        if (typeof globalThis.TransformStream === 'undefined') {
            const web = require('stream/web');
            if (web?.TransformStream) {
                globalThis.TransformStream = web.TransformStream;
                globalThis.ReadableStream ||= web.ReadableStream;
                globalThis.WritableStream ||= web.WritableStream;
                return;
            }
        }
    }
    catch {
    }
    const ponyfill = require('web-streams-polyfill');
    globalThis.TransformStream ||= ponyfill.TransformStream;
    globalThis.ReadableStream ||= ponyfill.ReadableStream;
    globalThis.WritableStream ||= ponyfill.WritableStream;
})();
const Zodex = require('zodex').Zodex;
let originalProcessEnv = (() => {
    try {
        const origConfig = dotenv.parse(require('fs').readFileSync('.env.local', { encoding: 'utf-8' }));
        return {
            REDIS_URL: origConfig.REDIS_URL,
            REDIS_PASSWORD: origConfig.REDIS_PASSWORD,
        };
    }
    catch (error) {
        return {};
    }
})();
export const withRedisConnection = () => {
    process.env.REDIS_URL =
        originalProcessEnv.REDIS_URL || 'redis://test-redis.local:6379';
    if (process.env.REDIS_URL.includes('test-redis.local')) {
    }
    process.env.REDIS_PASSWORD =
        originalProcessEnv.REDIS_PASSWORD || 'test-redis-password';
    if (process.env.REDIS_PASSWORD.includes('test-redis-password')) {
    }
};
globalThis.fetch = jest.fn().mockImplementation(() => {
    return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ response: 'error' }),
    });
});
export const mockFlagsmithInstanceFactory = ({ initialized = false, identifier = null, traits = null, flags = {}, cacheOptions = { ttl: 1000, skipAPI: false, loadStale: false }, apiUrl = process.env.NEXT_PUBLIC_FLAGSMITH_API_URL, environmentId = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID, loadingState = 'loading', } = {}) => {
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
const reportErrorToConsole = (report) => {
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
    }
    finally {
        if (typeof console.groupEnd === 'function') {
            console.groupEnd();
        }
    }
};
const onLoggedErrorEmitted = ({ error, context }) => reportErrorToConsole({ error, context });
beforeAll(() => {
    try {
        const origConfig = dotenv.parse(require('fs').readFileSync('.env.local', { encoding: 'utf-8' }));
        originalProcessEnv = {
            REDIS_URL: origConfig.REDIS_URL,
            REDIS_PASSWORD: origConfig.REDIS_PASSWORD,
        };
    }
    catch (error) {
        return {};
    }
});
jest.mock('@/lib/react-util/errors/logged-error-reporter', () => {
    return {
        reporter: jest.fn(() => Promise.resolve({
            subscribeToErrorReports: jest.fn(),
            unsubscribeFromErrorReports: jest.fn(),
            reportError: jest.fn().mockImplementation(async (_report) => {
                reportErrorToConsole(_report);
                return Promise.resolve(undefined);
            }),
            reportBoundaryError: jest.fn().mockResolvedValue(undefined),
            reportUnhandledRejection: jest.fn().mockResolvedValue(undefined),
            setupGlobalHandlers: jest.fn(),
            getStoredErrors: jest.fn(() => []),
            clearStoredErrors: jest.fn(),
        })),
    };
});
beforeEach(() => {
    LoggedError.subscribeToErrorReports(onLoggedErrorEmitted);
});
afterEach(() => {
    LoggedError.unsubscribeFromErrorReports(onLoggedErrorEmitted);
    Zodex.zerialize('__$$__reset__$$__');
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    SingletonProvider.Instance.clear();
});
//# sourceMappingURL=jest.setup.js.map