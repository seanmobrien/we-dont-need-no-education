import type { ImpersonationService } from './impersonation.types';
import { ImpersonationThirdParty } from './impersonation.thirdparty';
import { ImpersonationServiceCache } from './impersonation-service-cache';
import { auth } from '@/auth';
import { log } from '@/lib/logger';

/**
 * Strategy selection:
 * - Set AUTH_KEYCLOAK_IMPERSONATE_THIRDPARTY=true to use Third-party libs (KC Admin Client + openid-client) with Authorization Code flow
 * - Set AUTH_KEYCLOAK_IMPERSONATE_RESTAPI=true to use Admin REST API + Authorization Code flow
 * - Else, set AUTH_KEYCLOAK_IMPERSONATE_IMPLICIT=true to use Admin impersonation + Implicit flow
 * - Else, falls back to Token Exchange (audience, email required)
 *
 * All strategies implement ImpersonationService so callers can treat them uniformly.
 */
export const fromRequest = async ({
  audience,
}: {
  req?: Request;
  audience?: string;
} = {}): Promise<ImpersonationService | undefined> => {
  const session = await auth();
  if (!session?.user) {
    log((l) =>
      l.warn('Impersonation requested without an active user session'),
    );
    return undefined;
  }

  // Use cache if audience is provided
  if (session.user.id) {
    const cache = ImpersonationServiceCache.getInstance();

    return cache.getOrCreate(session.user.id, audience, async () => {
      const service = await ImpersonationThirdParty.fromRequest({
        audience,
        session,
      });
      if (!service) {
        throw new Error('Failed to create impersonation service');
      }
      return service;
    });
  }

  // Fallback to direct creation without caching
  return ImpersonationThirdParty.fromRequest({
    audience,
    session,
  });
};
