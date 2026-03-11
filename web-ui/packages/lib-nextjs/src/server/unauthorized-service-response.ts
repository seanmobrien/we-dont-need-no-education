import { NextResponse } from 'next/server';
import { SessionTokenKey } from '../utilities/session-token-key';
import { env } from '@compliance-theater/env';
import type { LikeNextRequest } from '@compliance-theater/types/lib/nextjs/types/like-nextrequest';

const getCookieValue = (req?: LikeNextRequest): string => {
  const cookies = req?.cookies;
  if (!cookies) {
    return '';
  }

  if (typeof cookies === 'object' && 'get' in cookies && typeof cookies.get === 'function') {
    return cookies.get(SessionTokenKey())?.value ?? '';
  }

  if (typeof cookies === 'object' && SessionTokenKey() in cookies) {
    const cookie = (cookies as Record<string, unknown>)[SessionTokenKey()];
    return typeof cookie === 'string' ? cookie : '';
  }

  return '';
};

export const unauthorizedServiceResponse = ({
  req,
  scopes = [],
}: {
  req?: LikeNextRequest;
  scopes?: Array<string>;
} = {}): Response => {
  const { nextUrl = new URL(env('NEXT_PUBLIC_HOSTNAME')) } = req ?? {
    nextUrl: undefined,
  };
  const isAuthenticated = getCookieValue(req).length > 0;
  const resourceMetadataPath = `/.well-known/oauth-protected-resource${nextUrl.pathname}`;
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Active session required.' },
    {
      status: isAuthenticated ? 403 : 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataPath}"${scopes && scopes.length > 0 ? ` scope="${scopes.join(' ')}"` : ''}`,
      },
    },
  );
};
