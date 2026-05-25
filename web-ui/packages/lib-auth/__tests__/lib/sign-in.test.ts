/**
 * @jest-environment node
 */

jest.mock('../../src/lib/server/update-account-tokens', () => ({
  __esModule: true,
  updateAccountTokens: jest.fn(),
}));

import { signIn } from '../../src/lib/sign-in';
import { updateAccountTokens } from '../../src/lib/server/update-account-tokens';

describe('sign-in token persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists keycloak tokens using providerAccountId when user.id is not numeric', async () => {
    (updateAccountTokens as jest.Mock).mockResolvedValue(undefined);

    await expect(
      signIn({
        user: {
          id: 'keycloak-subject-id',
        },
        account: {
          provider: 'keycloak',
          providerAccountId: 'keycloak-subject-id',
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          id_token: 'id-token',
          expires_at: 123,
        },
      } as never),
    ).resolves.toBe(true);

    expect(updateAccountTokens).toHaveBeenCalledWith(
      {
        userId: 'keycloak-subject-id',
        providerAccountId: 'keycloak-subject-id',
      },
      {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        expiresAt: 123,
        exp: undefined,
      },
    );
  });

  it('awaits keycloak token persistence before resolving sign-in', async () => {
    let resolveUpdate: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    (updateAccountTokens as jest.Mock).mockReturnValue(updatePromise);

    let settled = false;
    const signInPromise = signIn({
      user: {
        id: '123',
      },
      account: {
        provider: 'keycloak',
        providerAccountId: 'provider-account-id',
        access_token: 'access-token',
      },
    } as never).then(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(settled).toBe(false);

    resolveUpdate?.();
    await signInPromise;

    expect(settled).toBe(true);
  });
});