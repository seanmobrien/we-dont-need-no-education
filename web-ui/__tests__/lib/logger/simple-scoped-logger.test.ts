import { simpleScopedLogger } from '../../../lib/logger/simple-scoped-logger';
import { log } from '../../../lib/logger/core';
import type { ILogger } from '../../../lib/logger/types';

jest.mock('/lib/logger/core', () => ({
  log: jest.fn(),
}));

describe('simpleScopedLogger', () => {
  const mockLogger: ILogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
    trace: jest.fn(),
  };

  beforeEach(() => {
    // jest.clearAllMocks();
    (log as jest.Mock).mockImplementation((cb) => cb(mockLogger));
    Object.values(mockLogger).forEach((fn) => (fn as jest.Mock).mockClear());
  });

  it('should create a logger with debug, info, warn, and error methods', () => {
    const logger = simpleScopedLogger('TestSource');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should log messages with the correct source and message (string)', () => {
    const logger = simpleScopedLogger('MySource');
    logger.info('Hello world');
    expect(log).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'MySource',
        message: 'Hello world',
      }),
    );
  });

  it('should log messages with the correct source and message (object)', () => {
    const logger = simpleScopedLogger('ObjSource');
    const objMsg = { foo: 'bar' };
    logger.debug(objMsg);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ObjSource',
        message: objMsg,
      }),
    );
  });

  it('should include additional arguments as data', () => {
    const logger = simpleScopedLogger('DataSource');
    logger.warn('Warn!', 1, 2, { extra: true });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'DataSource',
        message: 'Warn!',
        data: [1, 2, { extra: true }],
      }),
    );
  });

  it('should use the format function if provided', () => {
    const format = jest.fn((msg) => ({ formatted: true, ...msg }));
    const logger = simpleScopedLogger({ source: 'Fmt', format });
    logger.error('err', 42);
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'Fmt',
        message: 'err',
        data: [42],
      }),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        formatted: true,
        source: 'Fmt',
        message: 'err',
        data: [42],
      }),
    );
  });

  it('should not log if no arguments are provided', () => {
    const logger = simpleScopedLogger('NoArgs');
    logger.info();
    expect(log).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should handle both string and object overloads', () => {
    const logger1 = simpleScopedLogger('StringSource');
    const logger2 = simpleScopedLogger({ source: 'ObjSource' });
    logger1.debug('msg1');
    logger2.debug('msg2');
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'StringSource', message: 'msg1' }),
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'ObjSource', message: 'msg2' }),
    );
  });

  it('should set timestamp as ISO string', () => {
    const logger = simpleScopedLogger('TimeSource');
    logger.info('timed');
    const callArg = (mockLogger.info as jest.Mock).mock.calls[0][0];
    expect(typeof callArg.timestamp).toBe('string');
    expect(new Date(callArg.timestamp).toISOString()).toBe(callArg.timestamp);
  });
});
