import type { ImpersonationService } from './impersonation.types';
import { ImpersonationThirdParty } from './impersonation.thirdparty';
import { ImpersonationServiceCache } from './impersonation-service-cache';
import { auth } from '@/auth';
import { log } from '@/lib/logger';
import type { User } from '@auth/core/types';

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
  return ImpersonationThirdParty.fromUser({ user: session.user, audience });
};

export const fromUserId = async ({
  user,
  audience,
}: {
  user: User | undefined;
  audience?: string;
}): Promise<ImpersonationService | undefined> => {
  if (!user || !user.id) {
    log((l) => l.warn('Impersonation requested without a userId'));
    return undefined;
  }
  const cache = ImpersonationServiceCache.getInstance();
  return cache.getOrCreate(user.id, audience, async () => {
    const service = await ImpersonationThirdParty.fromUser({
      user,
      audience,
    });
    if (!service) {
      throw new Error('Failed to create impersonation service');
    }
    return service;
  });
};
