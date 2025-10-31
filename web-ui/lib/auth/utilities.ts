import { getToken, JWT } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { env } from '@/lib/site-util/env';

export const KnownScopeValues = ['mcp-tool:read', 'mcp-tool'] as const;
export type KnownScope = (typeof KnownScopeValues)[number];
export const KnownScopeIndex = {
  ToolRead: 0,
  ToolReadWrite: 1,
} as const;

const REQUEST_DECODED_TOKEN: unique symbol = Symbol.for(
  '@/no-education/api/auth/decoded-token',
);
type RequestWithToken = NextRequest & {
  [REQUEST_DECODED_TOKEN]?: JWT;
};

export const extractToken = async (req: NextRequest): Promise<JWT | null> => {
  const check = (req as RequestWithToken)?.[REQUEST_DECODED_TOKEN];
  if (check) {
    return check;
  }
  const ret =
    (req as RequestWithToken)?.[REQUEST_DECODED_TOKEN] ??
    (await getToken({
      req: req,
      secret: env('AUTH_SECRET'),
    })) ??
    (await getToken({
      req: req,
      secret: env('AUTH_SECRET'),
      salt: `bearer-token`,
    }));
  if (ret && req) {
    (req as RequestWithToken)[REQUEST_DECODED_TOKEN] = ret;
  }
  return ret;
};

export const unauthorizedServiceResponse = ({
  req,
  scopes = [],
}: {
  req: NextRequest;
  scopes?: Array<string>;
}) => {
  const { nextUrl } = req;
  const resourceMetadataPath = `/.well-known/oauth-protected-resource${nextUrl.pathname}`;

  return require('@next/server').NextResponse.json(
    { error: 'Unauthorized', message: 'Active session required.' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataPath}"${scopes && scopes.length > 0 ? ` scope="${scopes.join(' ')}"` : ''}`,
      },
    },
  );
};
