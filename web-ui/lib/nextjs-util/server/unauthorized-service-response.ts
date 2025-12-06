import { NextRequest } from 'next/server';
import { makeJsonResponse } from './response';
import { SessionTokenKey } from '@/lib/auth/utilities';
import { env } from '@/lib/site-util/env';

export const unauthorizedServiceResponse = ({
  req,
  scopes = [],
}: {
  req?: NextRequest;
  scopes?: Array<string>;
} = {}) => {
  const { nextUrl = new URL(env('NEXT_PUBLIC_HOSTNAME')) } = req ?? {
    nextUrl: undefined,
  };
  const isAuthenticated = !!req?.cookies?.get(SessionTokenKey())?.value?.length;
  const resourceMetadataPath = `/.well-known/oauth-protected-resource${nextUrl.pathname}`;
  return makeJsonResponse(
    { error: 'Unauthorized', message: 'Active session required.' },
    {
      status: isAuthenticated ? 403 : 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataPath}"${scopes && scopes.length > 0 ? ` scope="${scopes.join(' ')}"` : ''}`,
      },
    },
  );
};
