 /**
 * @jest-environment node
 */
/**
 * @file utils.wrapRouteRequest.test.ts
 * @description Unit tests for wrapRouteRequest utility
 */
import { wrapRouteRequest, ErrorResponse } from '@/lib/nextjs-util/server';
import { ILogger, logger } from '@/lib/logger';

describe('wrapRouteRequest', () => {  
  it('should call the wrapped function and return its result', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const wrapped = wrapRouteRequest(fn);
    const result = await wrapped('a', 'b');
    expect(fn).toHaveBeenCalledWith('a', 'b');
    expect(result).toBe('ok');
  });

  it('should log info and error if log option is true', async () => {
    const logSpy = (await logger() as jest.Mocked<ILogger>);
    const fn = jest.fn().mockImplementation(() => { throw new Error('fail'); });        
    const wrapped = wrapRouteRequest(fn, { log: true });
    const result = await wrapped('x');
    expect(logSpy.error as jest.Mock).toHaveBeenCalled();
    expect(logSpy.info as jest.Mock).toHaveBeenCalled();
    expect(result).toBeInstanceOf(ErrorResponse);
    const body = await result.json();
    expect(body.error).toBe('An error occurred');
  });

  it('should not log if log option is false', async () => {
    const logSpy = (await logger()) as jest.Mocked<ILogger>;
    const fn = jest.fn().mockResolvedValue('ok');
    const wrapped = wrapRouteRequest(fn, { log: false });
    const result = await wrapped();
    expect(logSpy.info as jest.Mock).not.toHaveBeenCalled();
    expect(result).toBe('ok');
  });

  it('should return ErrorResponse on thrown error', async () => {
    const fn = jest.fn().mockImplementation(() => { throw new Error('bad'); });
    const wrapped = wrapRouteRequest(fn);
    const result = await wrapped();
    expect(result).toBeInstanceOf(ErrorResponse);
    const body = await result.json();
    expect(body.error).toBe('An error occurred');
  });

  it('should support async thrown errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('async fail'));
    const wrapped = wrapRouteRequest(fn);
    const result = await wrapped();
    expect(result).toBeInstanceOf(ErrorResponse);
    const body = await result.json();
    expect(body.error).toBe('An error occurred');
  });
});
