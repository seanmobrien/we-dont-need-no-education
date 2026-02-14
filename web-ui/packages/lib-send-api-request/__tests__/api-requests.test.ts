import { sendApiRequest, sendApiGetRequest, sendApiPostRequest, sendApiPutRequest, sendApiDeleteRequest, apiRequestHelperFactory, ApiRequestError } from '../src';

// Mock fetch globally
global.fetch = jest.fn();

describe('sendApiRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ success: true }),
      text: jest.fn().mockResolvedValue('text response'),
    });
  });

  describe('successful requests', () => {
    it('should make a GET request and parse JSON response', async () => {
      const result = await sendApiRequest({
        url: '/api/test',
        area: 'test',
        action: 'get',
        method: 'GET',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should make a POST request with JSON body', async () => {
      const input = { name: 'test', value: 123 };
      
      await sendApiRequest({
        url: '/api/create',
        area: 'test',
        action: 'create',
        method: 'POST',
        input,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        })
      );
    });

    it('should make a POST request with string body', async () => {
      const input = 'raw string data';
      
      await sendApiRequest({
        url: '/api/create',
        area: 'test',
        action: 'create',
        method: 'POST',
        input,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/create',
        expect.objectContaining({
          method: 'POST',
          body: input,
        })
      );
    });

    it('should parse text response when Content-Type is not JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/plain' }),
        text: jest.fn().mockResolvedValue('plain text'),
      });

      const result = await sendApiRequest({
        url: '/api/text',
        area: 'test',
        action: 'getText',
        method: 'GET',
      });

      expect(result).toBe('plain text');
    });
  });

  describe('cookie forwarding', () => {
    it('should forward cookies from server request', async () => {
      const mockRequest = {
        headers: new Headers({ cookie: 'session=abc123; token=xyz' }),
      };

      await sendApiRequest({
        url: '/api/protected',
        area: 'test',
        action: 'protected',
        method: 'GET',
        req: mockRequest as any,
        forwardCredentials: true,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers as Headers;
      expect(headers.get('Cookie')).toBe('session=abc123; token=xyz');
    });

    it('should handle array of cookies', async () => {
      const mockRequest = {
        headers: {
          cookie: ['session=abc123', 'token=xyz'],
        },
      };

      await sendApiRequest({
        url: '/api/protected',
        area: 'test',
        action: 'protected',
        method: 'GET',
        req: mockRequest as any,
        forwardCredentials: true,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers as Headers;
      expect(headers.get('Cookie')).toBe('session=abc123;token=xyz');
    });

    it('should not forward cookies when forwardCredentials is false', async () => {
      const mockRequest = {
        headers: new Headers({ cookie: 'session=abc123' }),
      };

      await sendApiRequest({
        url: '/api/public',
        area: 'test',
        action: 'public',
        method: 'GET',
        req: mockRequest as any,
        forwardCredentials: false,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers as Headers;
      expect(headers.get('Cookie')).toBeNull();
    });

    it('should not forward cookies when no request is provided', async () => {
      await sendApiRequest({
        url: '/api/public',
        area: 'test',
        action: 'public',
        method: 'GET',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers as Headers;
      expect(headers.get('Cookie')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw ApiRequestError for non-2xx responses with JSON error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'Invalid input' })),
      });

      await expect(
        sendApiRequest({
          url: '/api/error',
          area: 'test',
          action: 'error',
          method: 'POST',
        })
      ).rejects.toThrow(ApiRequestError);

      try {
        await sendApiRequest({
          url: '/api/error',
          area: 'test',
          action: 'error',
          method: 'POST',
        });
      } catch (error) {
        expect(ApiRequestError.isApiRequestError(error)).toBe(true);
        if (ApiRequestError.isApiRequestError(error)) {
          expect(error.message).toContain('Bad Request');
          expect(error.message).toContain('Invalid input');
        }
      }
    });

    it('should throw ApiRequestError for non-2xx responses with text error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error occurred'),
      });

      try {
        await sendApiRequest({
          url: '/api/error',
          area: 'test',
          action: 'error',
          method: 'GET',
        });
      } catch (error) {
        expect(ApiRequestError.isApiRequestError(error)).toBe(true);
        if (ApiRequestError.isApiRequestError(error)) {
          expect(error.message).toContain('Internal Server Error');
          expect(error.message).toContain('Server error occurred');
        }
      }
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(
        sendApiRequest({
          url: '/api/test',
          area: 'test',
          action: 'test',
          method: 'GET',
        })
      ).rejects.toThrow();
    });
  });

  describe('abort signal', () => {
    it('should pass abort signal to fetch', async () => {
      await sendApiRequest({
        url: '/api/test',
        area: 'test',
        action: 'test',
        method: 'GET',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].signal).toBeDefined();
    });

    it('should support cancellation', async () => {
      let abortController: AbortController | undefined;
      
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        abortController = { signal: options.signal } as any;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              headers: new Headers({ 'Content-Type': 'application/json' }),
              json: jest.fn().mockResolvedValue({ data: 'test' }),
            });
          }, 100);
        });
      });

      const promise = sendApiRequest({
        url: '/api/slow',
        area: 'test',
        action: 'slow',
        method: 'GET',
      });

      promise.cancel();

      await expect(promise.awaitable).rejects.toThrow('Promise was cancelled');
    });
  });
});

describe('HTTP method helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  it('sendApiGetRequest should make GET request', async () => {
    await sendApiGetRequest({
      url: '/api/users',
      area: 'users',
      action: 'list',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('sendApiPostRequest should make POST request', async () => {
    await sendApiPostRequest({
      url: '/api/users',
      area: 'users',
      action: 'create',
      input: { name: 'John' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sendApiPutRequest should make PUT request', async () => {
    await sendApiPutRequest({
      url: '/api/users/123',
      area: 'users',
      action: 'update',
      input: { name: 'Jane' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users/123',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('sendApiDeleteRequest should make DELETE request', async () => {
    await sendApiDeleteRequest({
      url: '/api/users/123',
      area: 'users',
      action: 'delete',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users/123',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('apiRequestHelperFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  it('should create helper with area pre-filled', async () => {
    const emailApi = apiRequestHelperFactory({ area: 'email' });

    await emailApi.get({
      url: '/api/emails',
      action: 'list',
    });

    // Verify that fetch was called - the area parameter is used internally for logging
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/emails',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should support all HTTP methods', async () => {
    const api = apiRequestHelperFactory({ area: 'test' });

    await api.get({ url: '/get', action: 'get' });
    await api.post({ url: '/post', action: 'post', input: {} });
    await api.put({ url: '/put', action: 'put', input: {} });
    await api.delete({ url: '/delete', action: 'delete' });

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});

describe('ApiRequestError', () => {
  it('should store response object', () => {
    const mockResponse = { status: 404, statusText: 'Not Found' } as Response;
    const error = new ApiRequestError('Not found', mockResponse);

    expect(error.response).toBe(mockResponse);
    expect(error.message).toBe('Not found');
  });

  it('should have working type guard', () => {
    const mockResponse = { status: 500 } as Response;
    const apiError = new ApiRequestError('API error', mockResponse);
    const normalError = new Error('Normal error');

    expect(ApiRequestError.isApiRequestError(apiError)).toBe(true);
    expect(ApiRequestError.isApiRequestError(normalError)).toBe(false);
    expect(ApiRequestError.isApiRequestError(null)).toBe(false);
    expect(ApiRequestError.isApiRequestError(undefined)).toBe(false);
    expect(ApiRequestError.isApiRequestError('string')).toBe(false);
  });
});
