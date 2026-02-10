/**
 * @file This module provides a mock implementation of a logger for testing purposes.
 *
 * The `logger` function returns an object with various logging methods (`warn`, `error`, `info`, `debug`, `silly`, `verbose`, `log`),
 * each of which is a Jest mock function. These mock functions log their calls to the console with a specific format,
 * indicating the method name and the arguments passed to it.
 *
 * This mock logger can be used in unit tests to verify that logging methods are called with the expected arguments
 * without actually performing any logging operations.
 */
const makeMockImplementation = (name: string) => {
  return (...args: unknown[]) =>
    console.log(`logger::${name} called with `, args);
};
export const logger = () => ({
  warn: jest.fn(makeMockImplementation('warn')),
  error: jest.fn(makeMockImplementation('error')),
  info: jest.fn(makeMockImplementation('info')),
  debug: jest.fn(makeMockImplementation('debug')),
  silly: jest.fn(makeMockImplementation('silly')),
  verbose: jest.fn(makeMockImplementation('verbose')),
  log: jest.fn(makeMockImplementation('log')),
});
export const log = jest.fn((cb: (l: ReturnType<typeof logger>) => void) =>
  cb(logger())
);
