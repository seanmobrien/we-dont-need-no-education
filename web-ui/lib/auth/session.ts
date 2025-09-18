import { JWT } from '@auth/core/jwt';
import { SessionWithAccountId } from './types';

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
    if (token.account_id !== undefined) {
      // Store account_id for use in the sesion callback
      session.user.account_id = token.account_id;
    }
  }
  return session;
};
