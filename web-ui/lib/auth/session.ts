import { JWT } from '@auth/core/jwt';

import { SessionWithAccountId } from './types';
import { log } from '../logger/core';

const hashFromServer = async (input: string): Promise<string> => {
  const { createHash } = require('crypto');
  return createHash('sha256').update(input).digest('hex');
};

const hashFromEdge = async (input: string): Promise<string> => {
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

const hash = async (input: string): Promise<string | undefined> => {
  try {
    if (globalThis && globalThis.crypto && globalThis.crypto.subtle) {
      return await hashFromEdge(input);
    } else {
      return await hashFromServer(input);
    }
  } catch (e) {
    log((l) => l.verbose('Error generating hash for user email', { error: e }));
  }
  return undefined;
};

export const session = async ({
  session,
  token,
}: {
  session: SessionWithAccountId;
  token: JWT;
}): Promise<SessionWithAccountId> => {
  if (session.user) {
    if (token.id) {
      session.user.id = String(token.id);
    }
    if (token.name && !session.user.name) {
      session.user.name = String(token.name);
    }
    if (token.email && !session.user.email) {
      session.user.email = String(token.email);
    }
    if (token.subject && !session.user.subject) {
      session.user.subject = String(token.subject);
    }
    if (token.account_id !== undefined) {
      // Store account_id for use in the sesion callback
      session.user.account_id = token.account_id;
    }

    // Generate SHA256 hash of user email
    if (session.user.email) {
      const hashedEmail = await hash(session.user.email);
      if (hashedEmail) {
        session.user.hash = hashedEmail;
      }
    }
  }
  return session;
};
