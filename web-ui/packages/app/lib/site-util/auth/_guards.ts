import { SessionExt } from './_types';

export const isSessionExt = (session: unknown): session is SessionExt => {
  return (
    !!session &&
    typeof session === 'object' &&
    'server' in session &&
    typeof session.server === 'object' &&
    session.server !== null &&
    'tokens' in session.server &&
    typeof session.server.tokens === 'object' &&
    session.server.tokens !== null
  );
};
