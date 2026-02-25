import { withJestTestExtensions } from '../jest.test-extensions';

const logSymbol = Symbol.for('@tests/logger-instance');

type LoggerInstance = {
  warn: jest.Mock;
  error: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
  silly: jest.Mock;
  verbose: jest.Mock;
  log: jest.Mock;
  trace: jest.Mock;
};

type GlobalWithLogger = typeof globalThis & {
  [logSymbol]?: LoggerInstance;
};
const getLogger = () => {
  const globalWithLogger = globalThis as GlobalWithLogger;
  if (!globalWithLogger[logSymbol]) {
    const makeMockImplementation = (name: string) => {
      return (...args: unknown[]) =>
        () => { };
    };
    globalWithLogger[logSymbol] = {
      warn: jest.fn(makeMockImplementation('warn')),
      error: jest.fn(makeMockImplementation('error')),
      info: jest.fn(makeMockImplementation('info')),
      debug: jest.fn(makeMockImplementation('debug')),
      silly: jest.fn(makeMockImplementation('silly')),
      verbose: jest.fn(makeMockImplementation('verbose')),
      log: jest.fn(makeMockImplementation('log')),
      trace: jest.fn(makeMockImplementation('trace')),
    };
  }
  return globalWithLogger[logSymbol];
};


let internalLog: (jest.Mock<void, [cb: (l: LoggerInstance) => void], any>) | undefined = undefined;
let internalLogger: (jest.Mock<Promise<LoggerInstance>, [], any>) | undefined = undefined;

type SymbolKey = string | symbol;

/*
type SingletonProvider = {
  get: <T = unknown, S extends SymbolKey = string>(
    symbol: S,
  ) => T | undefined;
  getOrCreate: <T, S extends SymbolKey = string>(
    symbol: S,
    factory: () => T | undefined,
  ) => T | undefined;
  getRequired: <T, S extends SymbolKey = string>(
    symbol: S,
    factory: () => T | undefined,
  ) => T;
  getOrCreateAsync: <T, S extends SymbolKey = string>(
    symbol: S,
    factory: () => Promise<T | undefined>,
  ) => Promise<T | undefined>;
  getRequiredAsync: <T, S extends SymbolKey = string>(
    symbol: S,
    factory: () => Promise<T | undefined>,
  ) => Promise<T>;
  has: <S extends SymbolKey = string>(symbol: S) => boolean;
  set: <T, S extends SymbolKey = string>(symbol: S, value: T) => void;
  clear: () => void;
  delete: <S extends SymbolKey = string>(symbol: S) => void;
};

const mockSingletonProviderFactory = ({
  withJestTestExtensions
}: {
  withJestTestExtensions: (() => {
    singletonStore: Map<SymbolKey, unknown>;
  })
}): SingletonProvider => {
  const globalStore = withJestTestExtensions().singletonStore;
  const PROVIDER_KEY = Symbol.for('@tests/singleton-provider');
  const existingProvider = globalStore.get(PROVIDER_KEY);
  if (existingProvider) {
    return existingProvider as SingletonProvider;
  }
  const provider = {
    get: <T = unknown, S extends SymbolKey = string>(symbol: S): T | undefined =>
      withJestTestExtensions().singletonStore.get(symbol) as T | undefined,
    getOrCreate: <T, S extends SymbolKey = string>(
      symbol: S,
      factory: () => T | undefined,
    ): T | undefined => {
      const singletonStore = withJestTestExtensions().singletonStore as Map<SymbolKey, unknown>;
      if (!singletonStore.has(symbol)) {
        const created = factory();
        if (created !== undefined && created !== null) {
          singletonStore.set(symbol, created);
        }
      }
      return singletonStore.get(symbol) as T | undefined;
    },
    getRequired: <T, S extends SymbolKey = string>(
      symbol: S,
      factory: () => T | undefined,
    ): T => {
      const value = provider.getOrCreate<T, S>(symbol, factory);
      if (value === undefined || value === null) {
        throw new Error(`Missing required singleton: ${String(symbol)}`);
      }
      return value;
    },
    getOrCreateAsync: async <T, S extends SymbolKey = string>(
      symbol: S,
      factory: () => Promise<T | undefined>,
    ): Promise<T | undefined> => {
      const singletonStore = withJestTestExtensions().singletonStore as Map<SymbolKey, unknown>;
      if (!singletonStore.has(symbol)) {
        const created = await factory();
        if (created !== undefined && created !== null) {
          singletonStore.set(symbol, created);
        }
      }
      return singletonStore.get(symbol) as T | undefined;
    },
    getRequiredAsync: async <T, S extends SymbolKey = string>(
      symbol: S,
      factory: () => Promise<T | undefined>,
    ): Promise<T> => {
      const value = await provider.getOrCreateAsync<T, S>(symbol, factory);
      if (value === undefined || value === null) {
        throw new Error(`Missing required singleton: ${String(symbol)}`);
      }
      return value;
    },
    has: <S extends SymbolKey = string>(symbol: S): boolean => {
      const singletonStore = withJestTestExtensions().singletonStore as Map<SymbolKey, unknown>;
      return singletonStore.has(symbol);
    },
    set: <T, S extends SymbolKey = string>(symbol: S, value: T): void => {
      if (value !== undefined && value !== null) {
        const singletonStore = withJestTestExtensions().singletonStore as Map<SymbolKey, unknown>;
        singletonStore.set(symbol, value);
      }
    },
    clear: (): void => {
      const singletonStore = withJestTestExtensions().singletonStore as Map<SymbolKey, unknown>;
      singletonStore.clear();
    },
    delete: <S extends SymbolKey = string>(symbol: S): void => {
      const singletonStore = withJestTestExtensions().singletonStore as Map<SymbolKey, unknown>;
      singletonStore.delete(symbol);
    },
  };
  globalStore.set(PROVIDER_KEY, provider);
  return provider;
};

jest.mock('@compliance-theater/logger/core', () => {
  return {
    get logger() {
      if (!internalLogger) {
        internalLogger = jest.fn(() => Promise.resolve(getLogger()));
      }
      return internalLogger;
    },
    get log() {
      internalLog = internalLog ?? jest.fn((cb: (l: LoggerInstance) => void) => {
        cb(getLogger());
      });
      return internalLog;
    },
    logEvent: jest.fn(() => Promise.resolve()),
  };
});
*/
jest.mock('@compliance-theater/logger', () => {
  const originalModule = jest.requireActual('@compliance-theater/logger');
  // Spy on static methods instead of replacing the class to preserve instanceof behavior
  const LoggedErrorWithSpies = originalModule.LoggedError;
  jest.spyOn(LoggedErrorWithSpies, 'subscribeToErrorReports');
  jest.spyOn(LoggedErrorWithSpies, 'unsubscribeFromErrorReports');
  jest.spyOn(LoggedErrorWithSpies, 'clearErrorReportSubscriptions');
  jest.spyOn(LoggedErrorWithSpies, 'isLoggedError');
  jest.spyOn(LoggedErrorWithSpies, 'buildMessage');
  jest.spyOn(LoggedErrorWithSpies, 'isTurtlesAllTheWayDownBaby');

  return {
    ...originalModule,
    logEvent: jest.fn(() => Promise.resolve()),
    get logger() {
      if (!internalLogger) {
        internalLogger = jest.fn(() => Promise.resolve(getLogger()));
      }
      return internalLogger;
    },
    get log() {
      internalLog = internalLog ?? jest.fn((cb: (l: LoggerInstance) => void) => {
        cb(getLogger());
      });
      return internalLog;
    },
    errorLogFactory: jest.fn((x) => x),
    simpleScopedLogger: jest.fn(() => getLogger()),
    LoggedError: LoggedErrorWithSpies
  };
});

import { LoggedError } from '@compliance-theater/logger';
import { logger } from '@compliance-theater/logger/core';

let emitWarningMock: jest.SpyInstance | undefined;

const mockEmitWarningImpl = (
  message: string,
  options?: { emitDepth?: number }
) => {
  // If the test suppress deprecation flag is set, then disable deprecation warnings
  if (withJestTestExtensions().suppressDeprecation) {
    return;
  }
  console.warn(message, options);
};

beforeEach(() => {
  if (
    typeof process !== 'undefined' &&
    typeof process.emitWarning === 'function'
  ) {
    emitWarningMock = jest.spyOn(process, 'emitWarning');
    emitWarningMock.mockImplementation(mockEmitWarningImpl);
  }
});
afterEach(() => {
  if (emitWarningMock) {
    emitWarningMock.mockRestore();
    emitWarningMock = undefined;
  }
});
