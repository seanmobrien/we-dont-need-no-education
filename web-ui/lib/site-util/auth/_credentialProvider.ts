import { OAuth2Client } from 'google-auth-library';
import { ICredential, CredentialOptions } from './_types';
import { env } from '../env';
import { serverSessionFactory } from './_session';
import { isSessionExt } from './_guards';
import { UrlBuilder } from '../url-builder/_impl';

const getGoogleAuthCredential = async ({
  session,
}: CredentialOptions): Promise<ICredential> => {
  const serverSession = isSessionExt(session)
    ? session.server
    : serverSessionFactory(session, true);
  const { gmail, refresh, access } = await serverSession.resolveTokens();
  const redirectUrl = new URL('/api/auth/callback/google', UrlBuilder.root);
  const ret = new OAuth2Client(
    env('AUTH_GOOGLE_ID'),
    env('AUTH_GOOGLE_SECRET'),
    redirectUrl.toString()
  );
  ret.setCredentials({
    // access_token: access,
    refresh_token: refresh,
  });
  return { gmail, refresh_token: refresh, access_token: access, client: ret };
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
