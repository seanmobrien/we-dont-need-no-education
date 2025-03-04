/* eslint-disable @typescript-eslint/no-unused-vars */
import { mockDeep } from 'jest-mock-extended';
import { OAuth2Client } from 'google-auth-library';
import { GaxiosError, GaxiosResponse } from 'gaxios';

const mockOAuth2Client = jest.fn().mockImplementation(() => {
  const ret = mockDeep<OAuth2Client>();
  ret.getAccessToken.mockImplementation(
    (cb?: (err: GaxiosError | null, accessToken?: string) => void) => {
      const token = {
        token: 'mock-access-token',
        res: mockDeep<GaxiosResponse>(),
      };
      if (cb) {
        cb(null, token.token);
      }
      return Promise.resolve(token);
    }
  );
  ret.refreshAccessToken.mockImplementation(
    (
      cb?: (
        err: GaxiosError | null,
        credentials?: object | null,
        res?: GaxiosResponse
      ) => void
    ) => {
      const result = {
        credentials: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
        res: mockDeep<GaxiosResponse>(),
      };
      if (cb) {
        cb(null, result.credentials, result.res);
      }
      return Promise.resolve(result);
    }
  );
  return ret;
});

export { mockOAuth2Client as OAuth2Client };
