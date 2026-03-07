/**
 * @jest-environment node
 */

jest.mock('@compliance-theater/database');
jest.mock('@compliance-theater/auth/lib/utilities/user-keys-server');

import { getActiveUserPublicKeys } from '@compliance-theater/auth/lib/utilities/user-keys-server';
import { NextURL } from 'next/dist/server/web/next-url';
import { NextRequest } from 'next/server';
import { withJestTestExtensions } from '../../../../shared/jest.test-extensions';
import { GET } from '../../../../../app/api/auth/session/route';


describe('AuthSessionRoute GET', () => {
  const mockKeys = ['key1', 'key2'];
  let mockSession: ReturnType<typeof withJestTestExtensions>['session'] | null =
    null;
  let mockedGetActiveUserPublicKeys = getActiveUserPublicKeys as jest.MockedFunction<
    typeof getActiveUserPublicKeys
  >;



  beforeEach(() => {
    mockedGetActiveUserPublicKeys = getActiveUserPublicKeys as jest.MockedFunction<
      typeof getActiveUserPublicKeys
    >;
    mockSession = withJestTestExtensions().session;
    mockedGetActiveUserPublicKeys.mockResolvedValue(mockKeys);
  });

  function makeNextRequest(url: string) {
    return { url, nextUrl: new NextURL(url) } as unknown as NextRequest;
  }

  it('returns unauthenticated if no session', async () => {
    withJestTestExtensions().session = null;
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
    expect(getActiveUserPublicKeys).toHaveBeenCalledWith({ userId: 123 });
    expect(json.publicKeys).toEqual(mockKeys);
  });

  it('returns authenticated session with keys if get-keys param is present and user id is string number', async () => {
    const session = {
      id: '123',
      expires: new Date(Date.now() + 1000).toISOString(),
      user: {
        id: '42',
        name: 'Test User',
        subject: 'test-subject',
        email: 'test@example.com',
      },
    };
    withJestTestExtensions().session = session;

    const req = makeNextRequest('http://localhost/api/auth/session?get-keys=1');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.data).toEqual(session);
    expect(getActiveUserPublicKeys).toHaveBeenCalledWith({ userId: 42 });
    expect(json.publicKeys).toEqual(mockKeys);
  });

  it('returns authenticated session without keys if get-keys param is present but user id is not a number', async () => {
    const session = {
      id: 'notanumber',
      user: {
        id: 'notanumber',
        name: 'Test User',
        subject: 'test-subject',
        email: 'test@example.com',
      },
      expires: new Date(Date.now() + 1000).toISOString(),
    };
    withJestTestExtensions().session = session;
    const req = makeNextRequest('http://localhost/api/auth/session?get-keys=1');
    const res = await GET(req);
    const json = await res.json();
    expect(json.status).toBe('authenticated');
    expect(json.data).toEqual(session);
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
