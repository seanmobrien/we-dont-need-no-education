import { refreshAccessToken } from '@/lib/auth/refresh-token';
import { JWT } from 'next-auth/jwt';
import { fetch } from '@compliance-theater/nextjs/dynamic-fetch';
import { hideConsoleOutput } from '@/__tests__/test-utils';

const DefaultTokenValues: JWT = {
  name: 'Test User',
  email: 'test@example.com',
  sub: '123',
  access_token: 'old_access_token',
  refresh_token: 'valid_refresh_token',
  expires_at: 1000,
  // iat: 1000,
  // exp: 1000,
  jti: 'uuid',
};

type JsonWebTokenParams = {
  defaults?: Partial<JWT>,
  token: string | Partial<JWT>,
  overrides?: Partial<JWT>,
};

export class JsonWebToken implements JWT {
  name?: string;
  email?: string;
  sub?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  iat?: number;
  exp?: number;
  jti?: string;

  [key: string]: string | number | undefined;

  constructor(params: JsonWebTokenParams);
  constructor(init?: Partial<JWT>, overrides?: Partial<JWT>);
  constructor(
    init?: Partial<JWT> | JsonWebTokenParams,
    overrides?: Partial<JWT>
  ) {
    const normalized = JsonWebToken.normalizeParams(init, overrides);
    Object.assign(this, normalized);
  }

  private static normalizeParams(
    init?: Partial<JWT> | JsonWebTokenParams,
    overrides?: Partial<JWT>
  ): JWT {
    if (!init) {
      return { ...DefaultTokenValues, ...(overrides ?? {}) };
    }

    if (typeof init === 'object' && 'token' in init && init.token !== undefined) {
      const payload = typeof init.token === 'string' ? { token: init.token } : init.token;
      return {
        ...(init.defaults ?? DefaultTokenValues),
        ...payload,
        ...(init.overrides ?? {}),
        ...(overrides ?? {}),
      };
    }

    const payload = typeof init === 'string' ? { token: init } : init;
    return {
      ...DefaultTokenValues,
      ...payload,
      ...(overrides ?? {}),
    };
  }
  static get TestToken() {
    return new JsonWebToken(DefaultTokenValues);
  }
}




describe('refreshAccessToken', () => {
  let mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReset();
  });


  const mockToken: JsonWebToken = JsonWebToken.TestToken;

  it('should refresh token successfully', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const mockResponse = {
      access_token: 'new_access_token',
      expires_in: 300,
      refresh_token: 'valid_refresh_token',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn(() => Promise.resolve(mockResponse)),
    } as unknown as Response);

    const refreshedToken = await refreshAccessToken(mockToken);

    expect(refreshedToken).toEqual(
      expect.objectContaining({
        access_token: 'new_access_token',
        refresh_token: 'valid_refresh_token',
      })
    );
    // 300s from now roughly
    expect(refreshedToken.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));



    expect(mockFetch).toHaveBeenCalledWith(
      'https://keycloak.example.com/realms/test/protocol/openid-connect/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.any(URLSearchParams),
      })
    );
  });

  it('should return original token with error if refresh fails', async () => {
    hideConsoleOutput().setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn(() => Promise.resolve({ error: 'invalid_grant' })),
    } as unknown as Response);

    const result = await refreshAccessToken(mockToken);

    expect(result).toEqual(
      expect.objectContaining({
        ...mockToken,
        error: expect.anything(),
      })
    );
  });

  it('should return error if no refresh token is present', async () => {
    hideConsoleOutput().setup();
    const noRefreshToken: JWT = { ...mockToken, refresh_token: undefined };
    const result = await refreshAccessToken(noRefreshToken);

    expect(result).toEqual(
      expect.objectContaining({
        ...noRefreshToken,
        error: expect.anything()
      })
    );
  });

  it('should fallback to old refresh token if new one is not returned', async () => {
    const mockResponse = {
      access_token: 'new_access_token',
      expires_in: 300,
      // no refresh_token in response
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const refreshedToken = await refreshAccessToken(mockToken);

    expect(refreshedToken.refresh_token).toBe('valid_refresh_token');
  });
});
