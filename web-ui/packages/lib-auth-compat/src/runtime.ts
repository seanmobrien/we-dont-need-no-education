import {
  MissingAuthCorePeerError,
  MissingDrizzleAdapterPeerError,
  MissingNextAuthPeerError,
} from './errors';
import type {
  Adapter,
  AuthConfig,
  NextAuthResult,
} from './contracts';

// ─── Lazy peer loaders ────────────────────────────────────────────────────────

type NextAuthModule = {
  default: (config: AuthConfig) => NextAuthResult;
};

type NextAuthReactModule = {
  useSession: () => {
    data: unknown;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    update: (data?: unknown) => Promise<unknown>;
  };
  signIn: (...args: unknown[]) => Promise<void>;
  signOut: (...args: unknown[]) => Promise<void>;
  SessionProvider: (props: {
    children: unknown;
    session?: unknown;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
  }) => unknown;
};

type NextAuthJwtModule = {
  getToken: (params: {
    req: Request | { headers: Record<string, string | string[]> };
    secret?: string | string[];
    secureCookie?: boolean;
    salt?: string;
    decode?: (params: unknown) => Promise<unknown>;
    logger?: unknown;
  }) => Promise<unknown>;
  encode: (params: unknown) => Promise<string>;
  decode: (params: unknown) => Promise<unknown>;
};

type AuthCoreModule = {
  Auth: (request: Request, config: AuthConfig) => Promise<Response>;
};

type DrizzleAdapterModule = {
  DrizzleAdapter: (db: unknown, options?: unknown) => Adapter;
};

let cachedNextAuth: NextAuthModule | undefined;
let cachedNextAuthReact: NextAuthReactModule | undefined;
let cachedNextAuthJwt: NextAuthJwtModule | undefined;
let cachedAuthCore: AuthCoreModule | undefined;
let cachedDrizzleAdapter: DrizzleAdapterModule | undefined;

const loadNextAuth = (): NextAuthModule => {
  if (cachedNextAuth) return cachedNextAuth;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNextAuth = require('next-auth') as NextAuthModule;
    return cachedNextAuth;
  } catch (error) {
    throw new MissingNextAuthPeerError(error);
  }
};

const loadNextAuthReact = (): NextAuthReactModule => {
  if (cachedNextAuthReact) return cachedNextAuthReact;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNextAuthReact = require('next-auth/react') as NextAuthReactModule;
    return cachedNextAuthReact;
  } catch (error) {
    throw new MissingNextAuthPeerError(error);
  }
};

const loadNextAuthJwt = (): NextAuthJwtModule => {
  if (cachedNextAuthJwt) return cachedNextAuthJwt;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNextAuthJwt = require('next-auth/jwt') as NextAuthJwtModule;
    return cachedNextAuthJwt;
  } catch (error) {
    throw new MissingNextAuthPeerError(error);
  }
};

const loadAuthCore = (): AuthCoreModule => {
  if (cachedAuthCore) return cachedAuthCore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedAuthCore = require('@auth/core') as AuthCoreModule;
    return cachedAuthCore;
  } catch (error) {
    throw new MissingAuthCorePeerError(error);
  }
};

const loadDrizzleAdapter = (): DrizzleAdapterModule => {
  if (cachedDrizzleAdapter) return cachedDrizzleAdapter;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedDrizzleAdapter = require('@auth/drizzle-adapter') as DrizzleAdapterModule;
    return cachedDrizzleAdapter;
  } catch (error) {
    throw new MissingDrizzleAdapterPeerError(error);
  }
};

// ─── Public runtime API ───────────────────────────────────────────────────────

/**
 * Initialises NextAuth with the provided config.
 * Lazily loads `next-auth` at call time.
 */
export const createNextAuth = (config: AuthConfig): NextAuthResult => {
  const mod = loadNextAuth();
  return mod.default(config);
};

/**
 * Returns the `next-auth/react` `useSession` hook.
 * Call this inside a React component – the peer is loaded lazily.
 */
export const useSession = () => loadNextAuthReact().useSession();

/**
 * `signIn` from `next-auth/react`.
 */
export const signIn = (...args: unknown[]): Promise<void> =>
  loadNextAuthReact().signIn(...args);

/**
 * `signOut` from `next-auth/react`.
 */
export const signOut = (...args: unknown[]): Promise<void> =>
  loadNextAuthReact().signOut(...args);

/**
 * `SessionProvider` from `next-auth/react`.
 */
export const getSessionProvider = () => loadNextAuthReact().SessionProvider;

/**
 * `getToken` from `next-auth/jwt`.
 */
export const getToken = (
  params: Parameters<NextAuthJwtModule['getToken']>[0],
) => loadNextAuthJwt().getToken(params);

/**
 * `encode` from `next-auth/jwt`.
 */
export const encodeJwt = (params: unknown): Promise<string> =>
  loadNextAuthJwt().encode(params);

/**
 * `decode` from `next-auth/jwt`.
 */
export const decodeJwt = (params: unknown): Promise<unknown> =>
  loadNextAuthJwt().decode(params);

/**
 * Core `Auth` handler from `@auth/core`.
 * Lazily loads `@auth/core` at call time.
 */
export const Auth = async (request: Request, config: AuthConfig): Promise<Response> => {
  const mod = loadAuthCore();
  return mod.Auth(request, config);
};

/**
 * `DrizzleAdapter` factory from `@auth/drizzle-adapter`.
 * Lazily loads the adapter at call time.
 */
export const createDrizzleAdapter = (db: unknown, options?: unknown): Adapter =>
  loadDrizzleAdapter().DrizzleAdapter(db, options);

export {
  MissingNextAuthPeerError,
  MissingAuthCorePeerError,
  MissingDrizzleAdapterPeerError,
  isMissingNextAuthPeerError,
  isMissingAuthCorePeerError,
  isMissingDrizzleAdapterPeerError,
} from './errors';

export type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  AuthConfig,
  Account,
  Awaitable,
  DefaultSession,
  DefaultUser,
  JWT,
  NextAuthHandlerRecord,
  NextAuthHandlers,
  NextAuthResult,
  Profile,
  Session,
  User,
  VerificationToken,
} from './contracts';
