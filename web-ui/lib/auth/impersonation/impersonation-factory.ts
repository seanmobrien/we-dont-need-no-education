import { ImpersonationService } from './impersonation.types';
import { ImpersonationThirdParty } from './impersonation.thirdparty';
import { env } from '../../site-util/env';

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
  audience?: string;
}): Promise<ImpersonationService | undefined> => {
  return ImpersonationThirdParty.fromRequest({
    audience,
    redirectUri: `${env('NEXT_PUBLIC_HOSTNAME')}/api/auth/callback/keycloak`,
  });
};
