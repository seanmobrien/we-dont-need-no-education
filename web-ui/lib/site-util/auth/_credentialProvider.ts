import { OAuth2Client } from 'google-auth-library';
import { ICredential, CredentialOptions } from './_types';
import { env } from '../env';
import { UrlBuilder } from '../url-builder/_impl';
import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';
import { auth } from '@/auth';

const tokenSymbol: unique symbol = Symbol('tokens');

type RequestWithTokens = (NextRequest | NextApiRequest) & {
  [tokenSymbol]: {
    [userId: number]: {
      refresh_token: string;
      access_token: string;
    };
  };
};

const isRequestWithTokens = (
  req: NextRequest | NextApiRequest,
): req is RequestWithTokens =>
  tokenSymbol && tokenSymbol in req && !!req[tokenSymbol];

/**
 * Get Google tokens from Keycloak for the specified user.
 * This function should be implemented to call Keycloak's token exchange API
 * to retrieve Google refresh/access tokens for the authenticated user.
 */
const getGoogleTokensFromKeycloak = async (
  userId: number,
): Promise<{ refresh_token: string; access_token: string }> => {
  // TODO: Implement Keycloak token exchange to get Google tokens
  // This should call Keycloak's token exchange endpoint to get Google tokens
  // Example: POST to /auth/realms/{realm}/protocol/openid-connect/token
  // with grant_type=urn:ietf:params:oauth:grant-type:token-exchange
  // and requested_subject for the Google provider
  
  throw new Error('Keycloak Google token retrieval not yet implemented. Please configure Keycloak with Google identity broker and implement this method.');
};

const getTokensFromUser = async (
  req: NextRequest | NextApiRequest,
  userId: number,
): Promise<Omit<ICredential, 'client'>> => {
  if (isRequestWithTokens(req) && req[tokenSymbol][userId]) {
    const tokens = req[tokenSymbol][userId];
    return {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      userId: userId,
    };
  }
  
  const session = await auth();
  if (!session) {
    throw new Error('Access denied');
  }
  if (Number(session.user!.id) !== userId) {
    // TODO: check if user is admin
    throw new Error('Access denied');
  }
  
  // Get Google tokens from Keycloak instead of direct database query
  const tokens = await getGoogleTokensFromKeycloak(userId);
  
  const work = req as RequestWithTokens;
  if (!work[tokenSymbol]) {
    work[tokenSymbol] = {};
  }
  
  work[tokenSymbol][userId] = {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
  };

  return {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    userId: userId,
  };
};

const getTokensFromSession = async (
  req: NextRequest | NextApiRequest,
): Promise<Omit<ICredential, 'client'>> => {
  const session = await auth();
  const userId = Number(session?.user?.id);
  if (isNaN(userId)) {
    throw new Error('Access denied');
  }
  return await getTokensFromUser(req, userId);
};

const getGoogleAuthCredential = async (
  ops: CredentialOptions,
): Promise<ICredential> => {
  const credentials =
    'userId' in ops && ops.userId
      ? await getTokensFromUser(ops.req, ops.userId)
      : await getTokensFromSession(ops.req);
  const redirectUrl = new URL('/api/auth/callback/google', UrlBuilder.root);
  const ret = new OAuth2Client(
    env('AUTH_GOOGLE_ID'),
    env('AUTH_GOOGLE_SECRET'),
    redirectUrl.toString(),
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
  options: CredentialOptions,
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
