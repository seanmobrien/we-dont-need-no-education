/**
 * @jest-environment node
 */
jest.mock('@/auth');
jest.mock('@/lib/drizzle-db');
jest.mock('@/lib/site-util/auth/user-keys');

import { GET } from '@/app/api/auth/session/route';
import { getActiveUserPublicKeys } from '@/lib/site-util/auth/user-keys';
import { auth } from '@/auth';
import { NextURL } from 'next/dist/server/web/next-url';
import { NextRequest } from 'next/server';



const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedGetActiveUserPublicKeys =
  getActiveUserPublicKeys as jest.MockedFunction<
    typeof getActiveUserPublicKeys
  >;
describe('AuthSessionRoute GET', () => {
  const mockSession = { id: 123, user: { id: 42, name: 'Test User' } };
  const mockKeys = ['key1', 'key2'];

  beforeEach(() => {
    // jest.clearAllMocks();
    mockedAuth.mockResolvedValue(mockSession as never);
    mockedGetActiveUserPublicKeys.mockResolvedValue(mockKeys);
  });

  function makeNextRequest(url: string) {
    return { url, nextUrl: new NextURL(url) } as unknown as NextRequest;
  }
  it('returns unauthenticated if no session', async () => {
    mockedAuth.mockResolvedValueOnce(null as never);
    const req = makeNextRequest('http://localhost/api/auth/session');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('unauthenticated');
    expect(json.data).toBeNull();
    expect(json.publicKeys).toBeUndefined();
  });

  it('returns authenticated session without keys if get-keys param is missing', async () => {
    const req = makeNextRequest('http://localhost/api/auth/session');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.data).toEqual(mockSession);
    expect(json.publicKeys).toBeUndefined();
  });

  it('returns authenticated session with keys if get-keys param is present and user id is number', async () => {
    const req = makeNextRequest('http://localhost/api/auth/session?get-keys=1');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.data).toEqual(mockSession);
    expect(getActiveUserPublicKeys).toHaveBeenCalledWith({ userId: 42 });
    expect(json.publicKeys).toEqual(mockKeys);
  });

  it('returns authenticated session with keys if get-keys param is present and user id is string number', async () => {
    mockedAuth.mockResolvedValueOnce({
      id: '123',
      user: { id: 42, name: 'Test User' },
    } as never);
    const req = makeNextRequest('http://localhost/api/auth/session?get-keys=1');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.data).toEqual({
      id: '123',
      user: { id: 42, name: 'Test User' },
    });
    expect(getActiveUserPublicKeys).toHaveBeenCalledWith({ userId: 42 });
    expect(json.publicKeys).toEqual(mockKeys);
  });

  it('returns authenticated session without keys if get-keys param is present but user id is not a number', async () => {
    mockedAuth.mockResolvedValueOnce({
      id: 'notanumber',
      user: { id: 'notanumber', name: 'Test User' },
    } as never);
    const req = makeNextRequest('http://localhost/api/auth/session?get-keys=1');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.data).toEqual({
      id: 'notanumber',
      user: { id: 'notanumber', name: 'Test User' },
    });
    expect(getActiveUserPublicKeys).not.toHaveBeenCalled();
    expect(json.publicKeys).toBeUndefined();
  });

  it('returns authenticated session with empty keys if getActiveUserPublicKeys returns empty', async () => {
    mockedGetActiveUserPublicKeys.mockResolvedValueOnce([]);
    const req = makeNextRequest('http://localhost/api/auth/session?get-keys=1');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.publicKeys).toEqual([]);
  });
});
