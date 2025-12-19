import { env } from '@/lib/site-util/env';
import type { AdminTokenConfig } from './impersonation.types';
import { log } from '@/lib/logger';


export const adminBaseFromIssuer = (
  issuer: string,
): { origin: string; realm: string; adminBase: string } | undefined => {

  const extractRealmFromIssuer = (issuer: string): string | undefined => {
    try {
      const u = new URL(issuer);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'realms');
      if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
      return undefined;
    } catch {
      return undefined;
    }
  };
  try {
    const u = new URL(issuer);
    const realm = extractRealmFromIssuer(issuer);
    if (!realm) return undefined;
    return {
      origin: u.origin,
      realm,
      adminBase: `${u.origin}/admin/realms/${encodeURIComponent(realm)}`,
    };
  } catch {
    return undefined;
  }
};

export const defaultConfigFromEnv = (): AdminTokenConfig => {
  const config = {
    issuer: env('AUTH_KEYCLOAK_ISSUER') || '',
    clientId: env('AUTH_KEYCLOAK_CLIENT_ID') || '',
    clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET') || '',
    redirectUri: env('AUTH_KEYCLOAK_REDIRECT_URI') || '',
    impersonatorUsername:
      env('AUTH_KEYCLOAK_IMPERSONATOR_USERNAME') || undefined,
    impersonatorPassword:
      env('AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD') || undefined,
    impersonatorOfflineToken:
      env('AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN') || undefined,
  };

  // Basic validation - detailed validation happens in constructor
  if (
    !config.issuer ||
    !config.clientId ||
    !config.clientSecret ||
    !config.redirectUri
  ) {
    log((l) =>
      l.warn('SystemTokenStore: incomplete environment configuration'),
    );
    throw new TypeError(
      'SystemTokenStore: Required environment variables are missing',
    );
  }

  const { realm, adminBase } = adminBaseFromIssuer(config.issuer) || {};
  if (!realm || !adminBase) {
    log((l) =>
      l.warn(
        'SystemTokenStore: Unable to extract realm or admin base from issuer',
      ),
    );
    throw new TypeError('SystemTokenStore: Invalid issuer URL format');
  }
  return {
    ...config,
    adminBase,
    realm,
  };
};
