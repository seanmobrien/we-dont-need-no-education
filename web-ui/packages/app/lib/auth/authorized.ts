import { Session } from '@auth/core/types';
import { NextRequest } from 'next/server';
import { extractToken, KnownScopeValues, KnownScopeIndex } from './utilities';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';

import { log } from '@compliance-theater/logger';

export const authorized = async ({
  auth,
  request,
}: {
  auth: Session | null;
  request?: NextRequest;
}) => {
  if (request) {
    const { nextUrl } = request;
    const publicFolders = ['/static/', '/.well-known/'];
    const publicPages = ['/', '/privacy'];

    if (publicFolders.some((folder) => nextUrl.pathname.startsWith(folder))) {
      return true;
    }

    // Allow anonymous access to homepage and privacy page
    if (publicPages.includes(nextUrl.pathname)) {
      return true;
    }
    // early-exit
    if (auth && auth.user) {
      if (auth.expires) {
        const expiresAt = new Date(auth.expires).getTime();
        if (Date.now() > expiresAt) {
          log((l) =>
            l.warn('Session has expired', { expiresAt, now: Date.now(), auth })
          );
          return unauthorizedServiceResponse({
            req: request,
            scopes: [
              KnownScopeValues[KnownScopeIndex.ToolRead],
              KnownScopeValues[KnownScopeIndex.ToolReadWrite],
            ],
          });
        }
      }
      return true;
    }
    const token = await extractToken(request);
    if (token) {
      if (token.exp) {
        if (Date.now() > token.exp) {
          log((l) =>
            l.warn('Token has expired', {
              expiresAt: token.exp,
              now: Date.now(),
              token,
            })
          );
          return unauthorizedServiceResponse({
            req: request,
            scopes: [
              KnownScopeValues[KnownScopeIndex.ToolRead],
              KnownScopeValues[KnownScopeIndex.ToolReadWrite],
            ],
          });
        }
      }
      return true;
    }
    // Handle API requests per https://modelcontextprotocol.io/specification/draft/basic/authorization
    if (nextUrl.pathname.startsWith('/api/') && !auth) {
      return unauthorizedServiceResponse({
        req: request,
        scopes: [
          KnownScopeValues[KnownScopeIndex.ToolRead],
          KnownScopeValues[KnownScopeIndex.ToolReadWrite],
        ],
      });
    }
  }
  return !!auth;
};
