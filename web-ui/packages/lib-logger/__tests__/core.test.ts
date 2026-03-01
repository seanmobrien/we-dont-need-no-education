let isRunningOnServerValue = true;
let emitSendCustomEventMock = jest.fn();
let underlyingLogger: Record<string, jest.Mock>;
let pinoFactoryMock: jest.Mock;

jest.mock('@compliance-theater/types/is-running-on', () => ({
  isRunningOnServer: () => isRunningOnServerValue,
}));

jest.mock('../src/log-emitter', () => ({
  emitSendCustomEvent: (...args: unknown[]) => emitSendCustomEventMock(...args),
}));

jest.mock('pino', () => {
  pinoFactoryMock = jest.fn(() => underlyingLogger);
  (pinoFactoryMock as unknown as { stdTimeFunctions: { isoTime: string } }).stdTimeFunctions = {
    isoTime: 'iso-time',
  };
  return {
    __esModule: true,
    default: pinoFactoryMock,
  };
});

describe('core logger/log/logEvent', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    emitSendCustomEventMock = jest.fn().mockResolvedValue(false);
    underlyingLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
      verbose: jest.fn(),
      silly: jest.fn(),
    };
    process.env.LOG_LEVEL_SERVER = '';
    process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT = '';
    process.env.JEST_WORKER_ID = '1';
  });

  it('creates server logger with normalized log level and caches logger instance', async () => {
    isRunningOnServerValue = true;
    process.env.LOG_LEVEL_SERVER = 'NOT_A_LEVEL';

    const { logger } = await import('../src/core');

    await logger();
    await logger();

    expect(pinoFactoryMock).toHaveBeenCalledTimes(1);
    expect(pinoFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info', name: 'app' }),
    );
  });

  it('creates client logger and disables pretty transport in jest', async () => {
    isRunningOnServerValue = false;
    process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT = 'TRACE';
    process.env.JEST_WORKER_ID = '1';

    const { logger } = await import('../src/core');
    await logger();

    expect(pinoFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'trace', transport: undefined }),
    );
  });

  it('creates client logger with pretty transport outside jest', async () => {
    isRunningOnServerValue = false;
    process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT = 'debug';
    delete process.env.JEST_WORKER_ID;

    const { logger } = await import('../src/core');
    await logger();

    expect(pinoFactoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
        transport: expect.objectContaining({ target: 'pino-pretty' }),
      }),
    );
  });

  it('runs callback immediately when internal logger is already initialized', async () => {
    isRunningOnServerValue = true;
    const { logger, log } = await import('../src/core');
    await logger();

    const result = await log(() => 'ok');
    expect(result).toBe('ok');
  });

  it('initializes logger when calling log before logger() is called', async () => {
    isRunningOnServerValue = true;
    const { log } = await import('../src/core');

    const result = await log(() => 'from-pre-init-log');

    expect(result).toBe('from-pre-init-log');
    expect(pinoFactoryMock).toHaveBeenCalledTimes(1);
  });

  it('skips fallback logging when event was processed by emitter', async () => {
    emitSendCustomEventMock = jest.fn().mockResolvedValue(true);
    const { logEvent } = await import('../src/core');

    await logEvent('warn', 'processed-event');

    expect(emitSendCustomEventMock).toHaveBeenCalledTimes(1);
    expect(underlyingLogger.warn).not.toHaveBeenCalled();
  });

  it('logs events with severity overload and measurements', async () => {
    const { logger, logEvent } = await import('../src/core');
    await logger();

    await logEvent('warn', 'login-attempt', { attempts: 2 });

    expect(emitSendCustomEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn' }),
    );
    expect(underlyingLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'login-attempt', measurements: { attempts: 2 } }),
    );
  });

  it('handles measurement-only and event-only logEvent overloads', async () => {
    const { logger, logEvent } = await import('../src/core');
    await logger();

    await logEvent('operation-name', { count: 3, result: 'ok' });
    await logEvent('event-only');

    expect(underlyingLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'measurement', measurements: { count: 3, result: 'ok' } }),
    );
    expect(underlyingLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'event-only' }),
    );
  });

  it('falls back to info when requested severity method is missing', async () => {
    delete underlyingLogger.warn;
    const { logger, logEvent } = await import('../src/core');
    await logger();

    await logEvent('warn', 'missing-warn');

    expect(underlyingLogger.info).toHaveBeenCalledTimes(1);
    expect(underlyingLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'missing-warn' }),
    );
  });

  it('falls back to console.warn when neither severity nor info method is available', async () => {
    delete underlyingLogger.warn;
    delete underlyingLogger.info;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { logger, logEvent } = await import('../src/core');
    await logger();

    await logEvent('warn', 'missing-all');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Logger misconfigured'),
      expect.objectContaining({ severity: 'warn' }),
    );

    warnSpy.mockRestore();
  });

  it('uses fallback info path when requested severity bind returns non-function', async () => {
    (underlyingLogger as unknown as Record<string, unknown>).warn = {
      bind: () => undefined,
    };

    const { logger, logEvent } = await import('../src/core');
    await logger();

    await logEvent('warn', 'warn-fallback-path');

    expect(underlyingLogger.info).toHaveBeenCalledTimes(2);
    expect(underlyingLogger.info).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ requestedSeverity: 'warn', actualSeverity: 'info' }),
    );
    expect(underlyingLogger.info).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: 'warn-fallback-path' }),
    );
  });
});
