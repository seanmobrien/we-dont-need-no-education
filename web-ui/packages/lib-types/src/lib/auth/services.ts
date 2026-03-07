/* global Request, Response */

import type { Session, User } from '@compliance-theater/types/next-auth';
import type { JWT } from '@compliance-theater/types/next-auth/jwt';
import type { LikeNextRequest } from '../nextjs/types/like-nextrequest';

export type AuthSessionServiceProps = {
    session: Session;
    token: JWT;
};

export type RequestWithAccessTokenCache = {
    access_token: string;
    refresh_token: string | undefined;
    id_token: string | undefined;
    expires_at: number | undefined;
    refresh_expires_at: number | undefined;
    providerAccountId: string;
    userId: number;
};

export type NormalizeAccessTokenOptions = {
    skipUserId?: boolean;
};

export type NormalizedAccessToken = {
    accessToken: string;
    userId: number;
};

export type UserContext = {
    userId: string;
    email?: string;
    name?: string;
    accountId?: string | number;
    hash?: string;
};

export type TokenExchangeParams = {
    subjectToken: string;
    audience?: string;
    requestedTokenType?: string;
    scope?: string;
};

export type GoogleTokens = {
    refresh_token?: string;
    access_token: string;
};

export type IImpersonationInstance = {
    getImpersonatedToken: (forceRefresh?: boolean) => Promise<string>;
    getUserContext: () => Readonly<UserContext>;
    clearCache: () => void;
    hasCachedToken: () => boolean;
};

export type IAuthSessionService = {
    sessionNodejs: (props: AuthSessionServiceProps) => Promise<Session>;
    sessionEdge: (props: AuthSessionServiceProps) => Promise<Session>;
};

export type IImpersonationService = {
    fromRequest: (props?: {
        req?: Request;
        audience?: string;
    }) => Promise<IImpersonationInstance | undefined>;
    fromUserId: (props: {
        user: User | undefined;
        audience?: string;
    }) => Promise<IImpersonationInstance | undefined>;
    forAdmin: () => Promise<IImpersonationInstance | undefined>;
};

export type IAccessTokenService = {
    withRequestTokens: (
        req: LikeNextRequest | undefined,
        value?: RequestWithAccessTokenCache,
    ) => RequestWithAccessTokenCache | undefined;
    withRequestAccessToken: (
        req: LikeNextRequest,
        value?: RequestWithAccessTokenCache,
    ) => string | LikeNextRequest | undefined;
    withRequestProviderAccountId: (
        req: LikeNextRequest | undefined,
    ) => string | undefined;
    getRequestTokens: (
        req: LikeNextRequest | undefined,
    ) => Promise<RequestWithAccessTokenCache | undefined>;
    getAccessToken: (req: LikeNextRequest | undefined) => Promise<string | undefined>;
    getProviderAccountId: (
        req: LikeNextRequest | undefined,
    ) => Promise<string | undefined>;
    getValidatedAccessToken: (props: {
        req: LikeNextRequest | undefined;
        source?: string;
    }) => Promise<{ token: string } | { error: Response }>;
    normalizedAccessToken: (
        userAccessTokenOrRequest: LikeNextRequest | string | undefined,
        options?: NormalizeAccessTokenOptions,
    ) => Promise<NormalizedAccessToken | undefined>;
    refreshAccessToken: (token: JWT) => Promise<JWT>;
};

export type ITokenExchangeService = {
    extractKeycloakToken: (req: unknown) => Promise<string>;
    exchangeForGoogleTokens: (params: TokenExchangeParams) => Promise<GoogleTokens>;
    getGoogleTokensFromRequest: (
        req: unknown,
        audience?: string,
    ) => Promise<GoogleTokens>;
    getGoogleTokensFromKeycloak: (
        req: unknown,
    ) => Promise<GoogleTokens>;
};
