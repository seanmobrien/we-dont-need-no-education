/**
 * Edge-compatible Session management strategy
 * JWT-based session handling for client-side support.
 * @module @/lib/auth/session-edge
 */

import type { JWT } from '@auth/core/jwt';
import type { Session } from '@auth/core/types';
import { setupSession } from './shared';
const hash = async (input: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  // convert to hex string
  const hashArray = Array.from(new Uint8Array(digest));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // attach to response for downstream usage
  return hashHex;
};

export const session = async (props: {
  session: Session;
  token: JWT;
}): Promise<Session> => {
  return setupSession({
    ...props,
    hash,
  });
};
