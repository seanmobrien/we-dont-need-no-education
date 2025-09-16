import { OAuth2Client } from 'google-auth-library';
import { ICredential, CredentialOptions } from './_types';
import { env } from '../env';
import { UrlBuilder } from '../url-builder/_impl';
import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';
import { auth } from '@/auth';
import { getToken } from 'next-auth/jwt';

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
 * This function calls Keycloak's token exchange API to retrieve Google refresh/access tokens 
 * for the authenticated user using their Keycloak session.
 */
const getGoogleTokensFromKeycloak = async (
  req: NextRequest | NextApiRequest,
  userId: number,
): Promise<{ refresh_token: string; access_token: string }> => {
  // Get the JWT token from the request using NextAuth's getToken function
  const token = await getToken({ 
    req: req as any,
    // Use the same secret as configured in NextAuth
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token) {
    throw new Error('No JWT token found in request');
  }

  // Extract Keycloak access token from the JWT
  // NextAuth stores the provider's access_token in the JWT when using OAuth providers
  const keycloakToken = token.access_token;

  if (!keycloakToken) {
    throw new Error('No Keycloak access token found in JWT');
  }

  // Get Keycloak configuration from environment
  const keycloakIssuer = env('AUTH_KEYCLOAK_ISSUER');
  const keycloakClientId = env('AUTH_KEYCLOAK_CLIENT_ID');
  const keycloakClientSecret = env('AUTH_KEYCLOAK_CLIENT_SECRET');

  if (!keycloakIssuer || !keycloakClientId || !keycloakClientSecret) {
    throw new Error('Missing Keycloak configuration');
  }

  // Construct the token exchange endpoint URL
  // Format: {issuer}/protocol/openid-connect/token
  const tokenEndpoint = `${keycloakIssuer.replace(/\/$/, '')}/protocol/openid-connect/token`;

  // Prepare the token exchange request
  const tokenExchangeParams = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: keycloakClientId,
    client_secret: keycloakClientSecret,
    subject_token: keycloakToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:refresh_token',
    // Request tokens for the Google identity provider
    // This should match the IDP alias configured in Keycloak for Google
    audience: 'google',
  });

  try {
    // Make the token exchange request to Keycloak
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenExchangeParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Keycloak token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();

    // Extract Google tokens from the response
    // The exact structure may vary based on Keycloak configuration
    const googleRefreshToken = tokenData.refresh_token;
    const googleAccessToken = tokenData.access_token;

    if (!googleRefreshToken || !googleAccessToken) {
      throw new Error('Invalid token response from Keycloak - missing Google tokens');
    }

    return {
      refresh_token: googleRefreshToken,
      access_token: googleAccessToken,
    };
  } catch (error) {
    throw new Error(`Failed to exchange Keycloak token for Google tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  const tokens = await getGoogleTokensFromKeycloak(req, userId);
  
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
