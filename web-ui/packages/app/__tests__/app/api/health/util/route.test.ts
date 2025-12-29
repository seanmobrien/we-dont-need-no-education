/**
 * @jest-environment node
 */
import { POST } from '@/app/api/health/util/route';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { NextRequest } from 'next/server';

// Mock SingletonProvider
jest.mock('@/lib/typescript/singleton-provider', () => {
  const clearMock = jest.fn();
  return {
    SingletonProvider: {
      Instance: {
        clear: clearMock,
      },
    },
    // Expose mock for assertions
    __mockClear: clearMock,
  };
});

describe('Health Utility Route', () => {
  const mockClear = SingletonProvider.Instance.clear as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear globals when action is reset-globals', async () => {
    const req = new NextRequest('http://localhost/api/health/util', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset-globals' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      status: 'ok',
      message: 'Global singletons cleared.',
    });
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('should return 400 if action is missing', async () => {
    const req = new NextRequest('http://localhost/api/health/util', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Missing action' });
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('should return 400 if action is invalid', async () => {
    const req = new NextRequest('http://localhost/api/health/util', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid-action' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid action: invalid-action' });
    expect(mockClear).not.toHaveBeenCalled();
  });
});
