/**
 * @jest-environment node
 */

jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');

/**
 * @file utils.wrapRouteRequest.test.ts
 * @description Unit tests for wrapRouteRequest utility
 */
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { ILogger, logger } from '@repo/lib-logger';
import { hideConsoleOutput } from '@/__tests__/test-utils';
import { NextRequest } from 'next/dist/server/web/spec-extension/request';

const consoleSpy = hideConsoleOutput();

const mockNextRequest = (): NextRequest => {
  return new NextRequest('http://localhost/test', {
    method: 'GET',
  });
};

describe('wrapRouteRequest', () => {
  afterEach(() => {
    consoleSpy.dispose();
  });
  it('should call the wrapped function and return its result', async () => {
    consoleSpy.setup();
    const fn = jest.fn().mockResolvedValue('ok');
    const wrapped = wrapRouteRequest(fn);
    const paramsPromise = Promise.resolve({ emailId: 'b' });
    const req = mockNextRequest();
    const result = await wrapped(req, { params: paramsPromise });
    expect(fn).toHaveBeenCalledWith(req, {
      params: paramsPromise,
      span: expect.objectContaining({
        _spanContext: expect.objectContaining({
          spanId: expect.any(String),
          traceId: expect.any(String),
          traceFlags: expect.any(Number),
        }),
      }),
    });
    expect(result).toBe('ok');
  });

  it('should log error if log option is true', async () => {
    consoleSpy.setup();
    const fn = jest.fn().mockImplementation(() => {
      throw new Error('fail');
    });
    const wrapped = wrapRouteRequest(fn, { log: true });
    const result = await wrapped(mockNextRequest(), {
      params: Promise.resolve({ emailId: 'y' }),
    });
    await new Promise((r) => setTimeout(r, 10)); // Wait for any async logs
    expect(result).toBeInstanceOf(Response);
    const body = await result!.json();
    expect(body.error).toContain('An unexpected error occurred');
  });

  it('should not log if log option is false', async () => {
    consoleSpy.setup();
    const logSpy = (await logger()) as jest.Mocked<ILogger>;
    const fn = jest.fn().mockResolvedValue('ok');
    const wrapped = wrapRouteRequest(fn, { log: false });
    const result = await wrapped(mockNextRequest(), {
      params: Promise.resolve({ emailId: 'y' }),
    });
    expect(logSpy.info as jest.Mock).not.toHaveBeenCalled();
    expect(result).toBe('ok');
  });

  it('should return errorResponseFactory on thrown error', async () => {
    consoleSpy.setup();
    const fn = jest.fn().mockImplementation(() => {
      throw new Error('bad');
    });
    const wrapped = wrapRouteRequest(fn);
    const result = await wrapped(mockNextRequest(), {
      params: Promise.resolve({ emailId: 'y' }),
    });
    expect(result).toBeInstanceOf(Response);
    const body = await result!.json();
    expect(body.error).toContain('An unexpected error occurred');
  });

  it('should support async thrown errors', async () => {
    consoleSpy.setup();
    const fn = jest.fn().mockRejectedValue(new Error('async fail'));
    const wrapped = wrapRouteRequest(fn);
    const result = await wrapped(mockNextRequest(), {
      params: Promise.resolve({ emailId: 'y' }),
    });
    expect(result).toBeInstanceOf(Response);
    const body = await result!.json();
    expect(body.error).toContain('An unexpected error occurred');
  });
});
