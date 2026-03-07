import type { Session, User as NextAuthUser } from '@compliance-theater/types/next-auth';
import type { LikeNextRequest } from '@compliance-theater/types/lib/nextjs/types/like-nextrequest';

type NextAuthUserWithAccountId = NextAuthUser;
type SessionWithAccountId = Session;

/**
 * A normalized access token and user id, usually extracted from a request or access token
 * input argument ala {@link AccessTokenOrRequestOverloads}.
 */
export type NormalizedAccessToken = {
  accessToken: string;
  userId: number;
};

/**
 * Options for normalizing an access token and user id.
 */
export type NormalizeAccessTokenOptions = {
  skipUserId?: boolean;
};

/**
 * Overloaded function signature for accepting an access token or request.
 */
export interface AccessTokenOrRequestOverloads<TRet> {
  /**
   * Accepts an access token.
   */
  (bearerToken: string): Promise<TRet | undefined>;
  /**
   * Accepts a request.
   */
  (request: LikeNextRequest | undefined): Promise<TRet | undefined>;
  /**
   * Accepts a request or access token.
   */
  (requestOrBearerToken: LikeNextRequest | string | undefined): Promise<TRet | undefined>;
}

/**
 * Extends {@link AccessTokenOrRequestOverloads} to include options for normalizing an access token and user id.
 */
export interface AccessTokenOrRequestOverloadsExt extends AccessTokenOrRequestOverloads<NormalizedAccessToken> {
  /**
   * Accepts an access token and options for normalizing an access token and user id.
   */
  (bearerToken: string, options?: NormalizeAccessTokenOptions): Promise<NormalizedAccessToken | undefined>;
  /**
   * Accepts a request and options for normalizing an access token and user id.
   */
  (request: LikeNextRequest | undefined, options?: NormalizeAccessTokenOptions): Promise<NormalizedAccessToken | undefined>;
  /**
   * Accepts a request or access token and options for normalizing an access token and user id.
   */
  (requestOrBearerToken: LikeNextRequest | string | undefined, options?: NormalizeAccessTokenOptions): Promise<NormalizedAccessToken | undefined>;
}


export type RequestWithAccessTokenCache = {
  access_token: string;
  refresh_token: string | undefined;
  id_token: string | undefined;
  expires_at: number | undefined;
  refresh_expires_at: number | undefined;
  providerAccountId: string;
  userId: number;
};

export interface RequestWithAccessTokenOverloads {
  (req: LikeNextRequest): string | undefined;
  (req: LikeNextRequest, value: RequestWithAccessTokenCache): LikeNextRequest;
}






export type { NextAuthUserWithAccountId, SessionWithAccountId };
