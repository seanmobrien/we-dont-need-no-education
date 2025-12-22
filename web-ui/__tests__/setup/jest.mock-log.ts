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

jest.mock('@/lib/logger/core', () => {
  return {
    logger: jest.fn(() => Promise.resolve(getLogger())),
    log: jest.fn((cb: (l: LoggerInstance) => void) => cb(getLogger())),
    logEvent: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('@/lib/logger', () => {
  const originalModule = jest.requireActual('@/lib/logger');
  return {
    ...originalModule,
    logEvent: jest.fn(() => Promise.resolve()),
    logger: jest.fn(() => getLogger()),
    log: jest.fn((cb: (l: LoggerInstance) => void) => cb(getLogger())),
    errorLogFactory: jest.fn((x) => x),
    simpleScopedLogger: jest.fn(() => getLogger()),
  };
});

import { logger, log } from '@/lib/logger/core';
import { log as log2 } from '@/lib/logger';
import { errorReporter } from '@/lib/error-monitoring';
import { withJestTestExtensions } from '../jest.test-extensions';

let emitWarningMock: jest.SpyInstance | undefined;


const mockEmitWarningImpl = (message: string, options?: { emitDepth?: number }) => {
  // If the test suppress deprecation flag is set, then disable deprecation warnings
  if (withJestTestExtensions().suppressDeprecation) {
    return;
  }
  console.warn(message, options);
};


beforeEach(() => {
  if (typeof process !== undefined && typeof process.emitWarning === 'function') {
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
