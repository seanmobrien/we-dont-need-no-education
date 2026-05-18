/**
 * @jest-environment node
 */

jest.mock('@compliance-theater/types/lib/nextjs/guards', () => ({
  __esModule: true,
  asNextRequest: jest.fn((request: Request) => ({
    ...request,
    nextUrl: new URL(request.url),
  })),
}));

jest.mock('@compliance-theater/nextjs/server/unauthorized-service-response', () => ({
  __esModule: true,
  unauthorizedServiceResponse: jest.fn(() => new Response(null, { status: 401 })),
}));

jest.mock('../../src/lib/utilities/extract-token', () => ({
  __esModule: true,
  extractToken: jest.fn(),
  KnownScopeValues: ['mcp-tool:read', 'mcp-tool:write'],
  KnownScopeIndex: {
    ToolRead: 0,
    ToolReadWrite: 1,
  },
}));

import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';

import { authorized } from '../../src/lib/authorized';
import { extractToken } from '../../src/lib/utilities/extract-token';

describe('authorized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a verified bearer token whose exp is in JWT seconds', async () => {
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'device-user',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    const result = await authorized({
      auth: null,
      request: new Request('http://localhost/api/protected'),
    });

    expect(result).toBe(true);
    expect(unauthorizedServiceResponse).not.toHaveBeenCalled();
  });

  it('rejects an expired bearer token whose exp is in JWT seconds', async () => {
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'device-user',
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    const result = await authorized({
      auth: null,
      request: new Request('http://localhost/api/protected'),
    });

    expect(result).toBeInstanceOf(Response);
    expect(unauthorizedServiceResponse).toHaveBeenCalledTimes(1);
  });
});