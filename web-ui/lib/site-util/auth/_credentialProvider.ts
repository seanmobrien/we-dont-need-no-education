import { OAuth2Client } from 'google-auth-library';
import { ICredential, CredentialOptions } from './_types';
import { env } from '../env';
import { serverSessionFactory } from './_session';
import { isSessionExt } from './_guards';
import { UrlBuilder } from '../url-builder/_impl';
import { query } from '@/lib/neondb';
import { Session } from 'next-auth';

const getTokensFromSession = async (
  session: Session
): Promise<Omit<ICredential, 'client'>> => {
  const serverSession = isSessionExt(session)
    ? session.server
    : serverSessionFactory(session, true);
  const { gmail, refresh, access } = await serverSession.resolveTokens();
  return { gmail, refresh_token: refresh, access_token: access };
};
const getTokensFromUser = async (
  userId: number
): Promise<Omit<ICredential, 'client'>> => {
  const records = await query(
    (sql) =>
      sql`select refresh_token, access_token from accounts where "userId"=${userId} and provider='google'`
  );
  if (!records.length) {
    throw new Error('Account not found');
  }
  return {
    refresh_token: records[0].refresh_token as string,
    access_token: records[0].access_token as string,
    gmail: null,
  };
};

const getGoogleAuthCredential = async (
  ops: CredentialOptions
): Promise<ICredential> => {
  const credentials =
    'session' in ops
      ? await getTokensFromSession(ops.session)
      : await getTokensFromUser(ops.userId);
  const redirectUrl = new URL('/api/auth/callback/google', UrlBuilder.root);
  const ret = new OAuth2Client(
    env('AUTH_GOOGLE_ID'),
    env('AUTH_GOOGLE_SECRET'),
    redirectUrl.toString()
  );
  ret.setCredentials({
    refresh_token: credentials.refresh_token,
  });
  return {
    ...credentials,
    client: ret,
  };
};

export const credentialFactory = async (
  options: CredentialOptions
): Promise<ICredential> => {
  const { provider } = options;
  switch (provider) {
    case 'google':
      return await getGoogleAuthCredential(options);
    default:
      break;
  }
  throw new Error(`Provider ${provider} not supported`);
};
