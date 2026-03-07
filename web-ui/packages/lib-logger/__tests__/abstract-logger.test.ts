import {
  ApplicationInsightsCustomEventName,
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_TYPE,
} from '../src/constants';
import { CustomAppInsightsEvent } from '../src/event';
import { AbstractLogger } from '../src/abstract-logger';

type Capture = {
  info?: Record<string, unknown>;
  warn?: Record<string, unknown>;
  error?: Record<string, unknown>;
  debug?: Record<string, unknown>;
  fatal?: Record<string, unknown>;
  verbose?: Record<string, unknown>;
  silly?: Record<string, unknown>;
  trace?: Record<string, unknown>;
};

class TestLogger extends AbstractLogger {
  public capture: Capture = {};

  protected logInfoMessage(record: object): void {
    this.capture.info = record as Record<string, unknown>;
  }
  protected logErrorMessage(record: object): void {
    this.capture.error = record as Record<string, unknown>;
  }
  protected logWarnMessage(record: object): void {
    this.capture.warn = record as Record<string, unknown>;
  }
  protected logDebugMessage(record: object): void {
    this.capture.debug = record as Record<string, unknown>;
  }
  protected logFatalMessage(record: object): void {
    this.capture.fatal = record as Record<string, unknown>;
  }
  protected logVerboseMessage(record: object): void {
    this.capture.verbose = record as Record<string, unknown>;
  }
  protected logSillyMessage(record: object): void {
    this.capture.silly = record as Record<string, unknown>;
  }
  protected logTraceMessage(record: object): void {
    this.capture.trace = record as Record<string, unknown>;
  }

  public buildForTest(message: unknown, ...args: unknown[]): [object] {
    return this.buildLogRecord(message as Record<string, unknown>, ...args);
  }
}

describe('AbstractLogger', () => {
  it('base class public methods throw via unimplemented protected log methods', () => {
    const base = new AbstractLogger();

    expect(() => base.info({ message: 'info' })).toThrow('Method not implemented');
    expect(() => base.error('error')).toThrow('Method not implemented');
    expect(() => base.warn({ message: 'warn' })).toThrow('Method not implemented');
    expect(() => base.debug({ message: 'debug' })).toThrow('Method not implemented');
    expect(() => base.fatal({ message: 'fatal' })).toThrow('Method not implemented');
    expect(() => base.verbose({ message: 'verbose' })).toThrow('Method not implemented');
    expect(() => base.silly({ message: 'silly' })).toThrow('Method not implemented');
    expect(() => base.trace({ message: 'trace' })).toThrow('Method not implemented');
  });

  it('builds a merged record for string messages with body args', () => {
    const logger = new TestLogger();

    logger.info('hello', { body: { a: 1 }, source: 'unit' });

    const record = logger.capture.info as Record<string, unknown>;
    expect(record.msg).toBe('hello');
    expect(record.source).toBe('unit');
    expect(record.body).toEqual({ a: 1 });
    expect(record.message).toBeUndefined();
  });

  it('drops empty body when string message args include an empty body object', () => {
    const logger = new TestLogger();

    logger.info('hello', { body: {} });

    const record = logger.capture.info as Record<string, unknown>;
    expect(record.body).toBeUndefined();
  });

  it('disposes disposable objects before serialization', () => {
    const logger = new TestLogger();
    const dispose = jest.fn();

    logger.info({ message: 'x', dispose } as unknown as object);

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('builds exception-shaped records for error inputs', () => {
    const logger = new TestLogger();
    const error = new Error('boom');
    (error as Error & { source?: string }).source = 'source-name';

    logger.error(error);

    const record = logger.capture.error as Record<string, unknown>;
    expect(record[ATTR_EXCEPTION_MESSAGE]).toBe('boom');
    expect(record[ATTR_EXCEPTION_TYPE]).toBe('source-name');
    expect(record.stack).toBeUndefined();
    expect(record.source).toBeUndefined();
  });

  it('builds custom app insights event records', () => {
    const logger = new TestLogger();
    const event = new CustomAppInsightsEvent('signup', { attempts: 1 });

    logger.info(event as unknown as object);

    const record = logger.capture.info as Record<string, unknown>;
    expect(record[ApplicationInsightsCustomEventName]).toBe('signup');
    expect(record.event).toBeUndefined();
    expect(record.measurements).toBeUndefined();
    expect(record.body).toEqual({ measurements: { attempts: 1 } });
  });

  it('filters invalid keys and throws for invalid non-object message types', () => {
    const logger = new TestLogger();
    const [record] = logger.buildForTest({ message: 'x', _private: true, fn: () => null, keep: 1 });
    const objectRecord = record as Record<string, unknown>;

    expect(objectRecord._private).toBeUndefined();
    expect(objectRecord.fn).toBeUndefined();
    expect(objectRecord.keep).toBe(1);

    expect(() => logger.buildForTest(42)).toThrow("Cannot use 'in' operator");
    expect(() => logger.buildForTest([])).toThrow('Message is not a valid object');
  });

  it('handles object messages with extra args and remains stable under key interception', () => {
    const logger = new TestLogger();

    logger.info({ message: 'with-extra-args' }, { data: true });
    expect(logger.capture.info).toBeDefined();

    const realObjectKeys = Object.keys;
    const keysSpy = jest
      .spyOn(Object, 'keys')
      .mockImplementation((obj: object): string[] => {
        const actual = realObjectKeys(obj);
        if (actual.length === 0) {
          return ['forced'];
        }
        return actual;
      });

    const [record] = logger.buildForTest({ message: 'force-branches' });
    const forcedRecord = record as Record<string, unknown>;

    expect(forcedRecord.msg).toBe('force-branches');

    keysSpy.mockRestore();
  });

  it('routes each log level through the corresponding protected method', () => {
    const logger = new TestLogger();

    logger.warn({ message: 'warn' });
    logger.debug({ message: 'debug' });
    logger.fatal({ message: 'fatal' });
    logger.verbose({ message: 'verbose' });
    logger.silly({ message: 'silly' });
    logger.trace({ message: 'trace' });

    expect(logger.capture.warn).toBeDefined();
    expect(logger.capture.debug).toBeDefined();
    expect(logger.capture.fatal).toBeDefined();
    expect(logger.capture.verbose).toBeDefined();
    expect(logger.capture.silly).toBeDefined();
    expect(logger.capture.trace).toBeDefined();
  });
});
