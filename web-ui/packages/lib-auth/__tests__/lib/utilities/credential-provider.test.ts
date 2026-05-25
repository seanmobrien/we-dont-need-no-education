/**
 * @jest-environment node
 */

const mockSetCredentials = jest.fn();
const mockGetGoogleTokensFromRequest = jest.fn();

jest.mock('google-auth-library', () => ({
  __esModule: true,
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: mockSetCredentials,
  })),
}));

jest.mock('../../../src/auth.node', () => ({
  __esModule: true,
  auth: jest.fn(),
}));

jest.mock('../../../src/lib/utilities/keycloak-token-exchange', () => ({
  __esModule: true,
  keycloakTokenExchange: jest.fn(() => ({
    getGoogleTokensFromRequest: mockGetGoogleTokensFromRequest,
  })),
  TokenExchangeError: class TokenExchangeError extends Error {},
}));

import { credentialFactory } from '../../../src/lib/utilities/_credentialProvider';
import { auth } from '../../../src/auth.node';
import { OAuth2Client } from 'google-auth-library';

describe('credentialFactory identity fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = 'https://example.test';
    process.env.AUTH_GOOGLE_ID = 'google-client-id';
    process.env.AUTH_GOOGLE_SECRET = 'google-client-secret';
  });

  it('uses session.user.account_id when session.user.id is non-numeric', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'provider-subject',
        account_id: 42,
      },
    });
    mockGetGoogleTokensFromRequest.mockResolvedValue({
      access_token: 'google-access-token',
      refresh_token: 'google-refresh-token',
    });

    const result = await credentialFactory({
      provider: 'google',
      req: {} as never,
    } as never);

    expect(result).toMatchObject({
      userId: 42,
      access_token: 'google-access-token',
      refresh_token: 'google-refresh-token',
    });
    expect(OAuth2Client).toHaveBeenCalled();
    expect((OAuth2Client as jest.Mock).mock.calls[0]?.[2]).toMatch(
      /\/api\/auth\/callback\/google$/,
    );
    expect(mockSetCredentials).toHaveBeenCalledWith({
      refresh_token: 'google-refresh-token',
    });
  });

  it('allows explicit userId when it matches session.user.account_id', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'provider-subject',
        account_id: 42,
      },
    });
    mockGetGoogleTokensFromRequest.mockResolvedValue({
      access_token: 'google-access-token',
      refresh_token: 'google-refresh-token',
    });

    await expect(
      credentialFactory({
        provider: 'google',
        req: {} as never,
        userId: 42,
      } as never),
    ).resolves.toMatchObject({
      userId: 42,
      access_token: 'google-access-token',
      refresh_token: 'google-refresh-token',
    });
  });
});