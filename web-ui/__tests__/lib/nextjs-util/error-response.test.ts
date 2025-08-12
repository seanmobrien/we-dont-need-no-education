/**
 * @jest-environment node
 */
/**
 * @file error-response.test.ts
 * @description Unit tests for ErrorResponse
 */
import { ErrorResponse } from '@/lib/nextjs-util/server/error-response';

describe('ErrorResponse', () => {
  it('should default to status 500 and generic message', async () => {
    const res = new ErrorResponse();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'An error occurred', status: 500 });
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('should use provided status code', async () => {
    const res = new ErrorResponse(404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'An error occurred', status: 404 });
  });

  it('should use provided status and message', async () => {
    const res = new ErrorResponse(401, 'Unauthorized');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized', status: 401 });
  });

  it('should use status and statusText from a Response', async () => {
    const base = new Response(null, { status: 403, statusText: 'Forbidden' });
    const res = new ErrorResponse(base);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'Forbidden', status: 403 });
  });

  it('should use message from an Error', async () => {
    const err = new Error('Something went wrong');
    const res = new ErrorResponse(err);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Something went wrong', status: 500 });
  });

  it('should combine messages when both Error and custom message provided', async () => {
    const err = new Error('Original');
    const res = new ErrorResponse(err, 'Custom');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Original - Custom', status: 500 });
  });

  it('should combine messages when both Response statusText and custom message provided', async () => {
    const base = new Response(null, { status: 400, statusText: 'Bad Request' });
    const res = new ErrorResponse(base, 'Custom');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Bad Request - Custom', status: 400 });
  });
});
