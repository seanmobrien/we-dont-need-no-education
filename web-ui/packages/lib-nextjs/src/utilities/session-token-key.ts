import { env } from '@compliance-theater/env';

/**
 * Get the session token cookie key
 * Copied from auth/utilities to avoid circular dependency
 */
export const SessionTokenKey = (): string => {
  const url = new URL(env('NEXT_PUBLIC_HOSTNAME'));
  return (
    (url.protocol === 'https:' ? '__Secure-' : '') + 'authjs.session-token'
  );
};
