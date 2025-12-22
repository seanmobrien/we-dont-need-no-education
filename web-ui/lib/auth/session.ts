import type { JWT } from '@auth/core/jwt';
import type { SessionWithAccountId } from './types';
import type { Session } from '@auth/core/types';

import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger/core';
import { decodeToken } from './utilities';

const hashFromServer = async (input: string): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  session: sessionFromProps,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> => {
  const session = sessionFromProps as SessionWithAccountId;
  if (session && !session.user && token && (token.id || token.email)) {
    // support loading session user from token if not present
    session.user = {} as SessionWithAccountId['user'];
  }
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

    if (session.user.email) {
      // Generate SHA256 hash of user email
      const hashedEmail = await hash(session.user.email);
      if (hashedEmail) {
        session.user.hash = hashedEmail;
      }
    }
  }
  if (token.resource_access) {
    session.resource_access = {
      ...token.resource_access,
    };
  } else if (token.access_token) {
    try {
      const accessToken = await decodeToken({
        token: String(token.access_token),
        verify: false,
      });
      if (accessToken.resource_access) {
        session.resource_access = {
          ...accessToken.resource_access,
        };
      }
    } catch (e) {
      LoggedError.isTurtlesAllTheWayDownBaby(e, {
        log: true,
        source: 'authjs:session.decode-access-token',
      });
    }
  }
  if (token.error) {
    session.error = token.error;
  }
  return session;
};
