import type { Session } from '@compliance-theater/types/next-auth';
import { Awaitable } from '@compliance-theater/types/auth-core/types';
import { asNextRequest } from '@compliance-theater/types/lib/nextjs/guards';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';
import { log } from '@compliance-theater/logger/core';
import { extractToken, KnownScopeValues, KnownScopeIndex } from './utilities/extract-token';

type AuthorizedCallback = (params: {
  /** The request to be authorized. */
  request: Request;
  /** The authenticated user or token, if any. */
  auth: Session | null
}) => Awaitable<boolean | Response | undefined>;

type AuthorizedParams = Parameters<AuthorizedCallback>[0];

export const authorized = async ({
  auth,
  request: requestFromProps,
}: AuthorizedParams & {
  auth: Session | null;
}) => {
  const request = asNextRequest(requestFromProps);
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
