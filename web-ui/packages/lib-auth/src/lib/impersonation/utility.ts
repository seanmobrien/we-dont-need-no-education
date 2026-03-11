import { env } from '@compliance-theater/env';
import type { AdminTokenConfig } from './impersonation.types';
import { log } from '@compliance-theater/logger';

export const adminBaseFromIssuer = (
  issuer: string
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
  type AdminEnvKey =
    | 'AUTH_KEYCLOAK_ISSUER'
    | 'AUTH_KEYCLOAK_CLIENT_ID'
    | 'AUTH_KEYCLOAK_CLIENT_SECRET'
    | 'AUTH_KEYCLOAK_REDIRECT_URI'
    | 'AUTH_KEYCLOAK_IMPERSONATOR_USERNAME'
    | 'AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD'
    | 'AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN';
  const fromEnv = (key: AdminEnvKey): string => {
    const valueFromProcess = process.env[key];
    if (typeof valueFromProcess === 'string') {
      return valueFromProcess;
    }
    const valueFromEnv = env(key);
    return typeof valueFromEnv === 'string' ? valueFromEnv : '';
  };

  const config = {
    issuer: fromEnv('AUTH_KEYCLOAK_ISSUER'),
    clientId: fromEnv('AUTH_KEYCLOAK_CLIENT_ID'),
    clientSecret: fromEnv('AUTH_KEYCLOAK_CLIENT_SECRET'),
    redirectUri: fromEnv('AUTH_KEYCLOAK_REDIRECT_URI'),
    impersonatorUsername:
      fromEnv('AUTH_KEYCLOAK_IMPERSONATOR_USERNAME') || undefined,
    impersonatorPassword:
      fromEnv('AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD') || undefined,
    impersonatorOfflineToken:
      fromEnv('AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN') || undefined,
  };

  // Basic validation - detailed validation happens in constructor
  if (
    !config.issuer ||
    !config.clientId ||
    !config.clientSecret ||
    !config.redirectUri
  ) {
    log((l) =>
      l.warn('SystemTokenStore: incomplete environment configuration')
    );
    throw new TypeError(
      'SystemTokenStore: Required environment variables are missing'
    );
  }

  const { realm, adminBase } = adminBaseFromIssuer(config.issuer) || {};
  if (!realm || !adminBase) {
    log((l) =>
      l.warn(
        'SystemTokenStore: Unable to extract realm or admin base from issuer'
      )
    );
    throw new TypeError('SystemTokenStore: Invalid issuer URL format');
  }
  return {
    ...config,
    adminBase,
    realm,
  };
};
