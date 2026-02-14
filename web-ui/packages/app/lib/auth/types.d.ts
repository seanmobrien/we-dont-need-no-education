import type { Session, User as NextAuthUser } from '@auth/core/types';
import type { NextRequest } from 'next/server';
type NextAuthUserWithAccountId = NextAuthUser;
type SessionWithAccountId = Session;
export type NormalizedAccessToken = {
    accessToken: string;
    userId: number;
};
export type NormalizeAccessTokenOptions = {
    skipUserId?: boolean;
};
export interface AccessTokenOrRequestOverloads<TRet> {
    (bearerToken: string): Promise<TRet | undefined>;
    (request: NextRequest | undefined): Promise<TRet | undefined>;
    (requestOrBearerToken: NextRequest | string | undefined): Promise<TRet | undefined>;
}
export interface AccessTokenOrRequestOverloadsExt extends AccessTokenOrRequestOverloads<NormalizedAccessToken> {
    (bearerToken: string, options?: NormalizeAccessTokenOptions): Promise<NormalizedAccessToken | undefined>;
    (request: NextRequest | undefined, options?: NormalizeAccessTokenOptions): Promise<NormalizedAccessToken | undefined>;
    (requestOrBearerToken: NextRequest | string | undefined, options?: NormalizeAccessTokenOptions): Promise<NormalizedAccessToken | undefined>;
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
    (req: NextRequest): string | undefined;
    (req: NextRequest, value: RequestWithAccessTokenCache): NextRequest;
}
export type { NextAuthUserWithAccountId, SessionWithAccountId };
//# sourceMappingURL=types.d.ts.map