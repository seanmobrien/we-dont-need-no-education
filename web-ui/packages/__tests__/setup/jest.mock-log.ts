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
        () => {};
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

jest.mock('@compliance-theater/logger/core', () => {
  return {
    logger: jest.fn(() => Promise.resolve(getLogger())),
    log: jest.fn((cb: (l: LoggerInstance) => void) => cb(getLogger())),
    logEvent: jest.fn(() => Promise.resolve()),
  };
});

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
    logger: jest.fn(() => getLogger()),
    log: jest.fn((cb: (l: LoggerInstance) => void) => cb(getLogger())),
    errorLogFactory: jest.fn((x) => x),
    simpleScopedLogger: jest.fn(() => getLogger()),
    LoggedError: LoggedErrorWithSpies
  };
});

import { LoggedError } from '@compliance-theater/logger';
import { logger } from '@compliance-theater/logger/core';
import { withJestTestExtensions } from '../jest.test-extensions';

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
