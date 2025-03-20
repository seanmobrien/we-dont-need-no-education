import { OAuth2Client } from 'google-auth-library';
import { ICredential, CredentialOptions } from './_types';
import { env } from '../env';
import { UrlBuilder } from '../url-builder/_impl';
import { query } from '@/lib/neondb';
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
  const records = await query(
    (sql) =>
      sql`select refresh_token, access_token from accounts where "userId"=${userId} and provider='google'`,
  );
  if (!records.length) {
    throw new Error('Account not found');
  }
  const work = req as RequestWithTokens;
  if (!work[tokenSymbol]) {
    work[tokenSymbol] = {};
  }
  const { refresh_token, access_token } = {
    refresh_token: String(records[0].refresh_token),
    access_token: String(records[0].access_token),
  };
  work[tokenSymbol][userId] = {
    refresh_token,
    access_token,
  };

  return {
    refresh_token,
    access_token,
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
