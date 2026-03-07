import { WrappedLogger } from '../src/wrapped-logger';
import type { ILogger } from '../src/types';

const createMockLogger = (): ILogger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
});

describe('WrappedLogger', () => {
  it('forwards all log levels to the wrapped logger', () => {
    const inner = createMockLogger();
    const logger = new WrappedLogger(inner);

    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    logger.debug('debug');
    logger.fatal('fatal');
    logger.verbose('verbose');
    logger.silly('silly');
    logger.trace('trace');

    expect(inner.info).toHaveBeenCalledTimes(1);
    expect(inner.warn).toHaveBeenCalledTimes(1);
    expect(inner.error).toHaveBeenCalledTimes(1);
    expect(inner.debug).toHaveBeenCalledTimes(1);
    expect(inner.fatal).toHaveBeenCalledTimes(1);
    expect(inner.verbose).toHaveBeenCalledTimes(1);
    expect(inner.silly).toHaveBeenCalledTimes(1);
    expect(inner.trace).toHaveBeenCalledTimes(1);
  });
});
