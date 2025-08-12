import { parseResponseOptions, ErrorResponse } from '@/lib/nextjs-util/server/error-response';

describe('parseResponseOptions', () => {
  test('string + number => message and status', () => {
    const res = parseResponseOptions('oops', 400);
    expect(res).toMatchObject({ status: 400, message: 'oops' });
    expect(res.cause).toBeUndefined();
    expect(res.source).toBeUndefined();
  });

  test('Error + string => cause from error.name, message override', () => {
    const err = new Error('boom');
    const res = parseResponseOptions(err, 'override');
    expect(res.status).toBe(500);
    expect(res.message).toBe('override');
    expect(res.cause).toBe('Error');
  });

  test('options with source + Error => source kept, message from Error, cause name', () => {
    const err = new Error('x');
    const res = parseResponseOptions({ status: 404, source: 'route' }, err);
    expect(res.status).toBe(404);
    expect(res.source).toBe('route');
    expect(res.cause).toBe('Error');
    expect(res.message).toBe('x');
  });

  test('number only => status set, default message', () => {
    const res = parseResponseOptions(500);
    expect(res.status).toBe(500);
    expect(res.message).toBe('An error occurred');
  });

  test('Error only => default status, message from error, cause name', () => {
    const res = parseResponseOptions(new TypeError('bad'));
    expect(res.status).toBe(500);
    expect(res.message).toBe('bad');
    expect(res.cause).toBe('TypeError');
  });

  test('string + options => options override status/source, message from string', () => {
    const res = parseResponseOptions('auth failed', { status: 401, source: 'auth' });
    expect(res.status).toBe(401);
    expect(res.message).toBe('auth failed');
    expect(res.source).toBe('auth');
  });

  test('options with cause carrying source extracts source and stringifies cause', () => {
    const causeWithSource = Object.assign(new Error('hi'), { source: 'svc' });
    const res = parseResponseOptions({ cause: causeWithSource });
    expect(res.status).toBe(500);
    expect(res.message).toBe('An error occurred');
    expect(res.source).toBe('svc');
    expect(res.cause).toBe('Error');
  });
});

describe('ErrorResponse', () => {
  test('serializes message and status correctly', async () => {
    const r = new ErrorResponse(404, 'Not found');
    expect(r.status).toBe(404);
    expect(r.headers.get('Content-Type')).toBe('application/json');
    const body = await r.json();
    expect(body).toEqual({ error: 'Not found', status: 404 });
  });

  test('derives from Error input', async () => {
    const r = new ErrorResponse(new Error('boom'));
    expect(r.status).toBe(500);
    const body = await r.json();
    expect(body).toEqual({ error: 'boom', status: 500 });
  });
});
