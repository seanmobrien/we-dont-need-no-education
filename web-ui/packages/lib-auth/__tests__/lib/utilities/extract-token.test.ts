/**
 * @jest-environment node
 */

jest.mock('@compliance-theater/auth-compat/runtime', () => ({
  __esModule: true,
  getToken: jest.fn(),
}));

jest.mock('@compliance-theater/env', () => ({
  __esModule: true,
  env: (key: string) => {
    if (key === 'NEXT_PUBLIC_HOSTNAME') return 'http://localhost:3000';
    if (key === 'AUTH_SECRET') return process.env.AUTH_SECRET;
    if (key === 'AUTH_KEYCLOAK_ISSUER') {
      return 'https://keycloak.example.com/realms/test';
    }
    return process.env[key];
  },
}));

jest.mock('../../../src/lib/utilities/decode-token', () => ({
  __esModule: true,
  decodeToken: jest.fn(),
}));

import { getToken } from '@compliance-theater/auth-compat/runtime';

import {
  extractToken,
  extractTokenDetails,
} from '../../../src/lib/utilities/extract-token';
import { decodeToken } from '../../../src/lib/utilities/decode-token';

describe('extractToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_SECRET = 'test-auth-secret';
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it('returns a verified bearer token payload before Auth.js token parsing', async () => {
    const verifiedPayload = {
      sub: 'device-user',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    (decodeToken as jest.Mock).mockResolvedValue(verifiedPayload);

    const request = new Request('http://localhost/api/device', {
      headers: {
        authorization: 'Bearer device.access.token',
      },
    });

    await expect(extractToken(request)).resolves.toEqual(verifiedPayload);

    expect(decodeToken).toHaveBeenCalledWith({
      token: 'device.access.token',
      verify: true,
    });
    expect(getToken).not.toHaveBeenCalled();
  });

  it('reports a verified bearer token source before Auth.js token parsing', async () => {
    const verifiedPayload = {
      sub: 'device-user',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    (decodeToken as jest.Mock).mockResolvedValue(verifiedPayload);

    const request = new Request('http://localhost/api/device', {
      headers: {
        authorization: 'Bearer device.access.token',
      },
    });

    await expect(extractTokenDetails(request)).resolves.toEqual({
      source: 'verified-bearer',
      token: verifiedPayload,
      bearerToken: 'device.access.token',
      verifiedBearerToken: 'device.access.token',
    });
  });

  it('falls back to Auth.js token parsing when bearer verification fails', async () => {
    const authJsToken = {
      sub: 'authjs-user',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    (decodeToken as jest.Mock).mockRejectedValue(new Error('bad signature'));
    (getToken as jest.Mock)
      .mockResolvedValueOnce(authJsToken)
      .mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/device', {
      headers: {
        authorization: 'Bearer app.issued.token',
      },
    });

    await expect(extractToken(request)).resolves.toEqual(authJsToken);

    expect(decodeToken).toHaveBeenCalledWith({
      token: 'app.issued.token',
      verify: true,
    });
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('reports an Auth.js token source when bearer verification fails', async () => {
    const authJsToken = {
      sub: 'authjs-user',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    (decodeToken as jest.Mock).mockRejectedValue(new Error('bad signature'));
    (getToken as jest.Mock)
      .mockResolvedValueOnce(authJsToken)
      .mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/device', {
      headers: {
        authorization: 'Bearer app.issued.token',
      },
    });

    await expect(extractTokenDetails(request)).resolves.toEqual({
      source: 'authjs',
      token: authJsToken,
      bearerToken: 'app.issued.token',
    });
  });
});