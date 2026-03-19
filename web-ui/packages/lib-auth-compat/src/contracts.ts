/**
 * Peer-safe contract types for next-auth, @auth/core and @auth/drizzle-adapter.
 * These types are manually aligned with the peer libraries so consumers do not
 * need to install those packages to work with the shared surface area.
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export type Awaitable<T> = T | PromiseLike<T>;

export type Profile = {
  sub?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  [key: string]: unknown;
};

// ─── Session / User / Account ─────────────────────────────────────────────────

export interface DefaultUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface DefaultSession {
  user?: DefaultUser;
  expires: string;
}

export type User = DefaultUser & {
  id?: string;
  account_id?: number;
  emailVerified?: Date;
  subject?: string;
  hash?: string;
};

export type Account = {
  provider: string;
  providerAccountId: string;
  type: string;
  access_token?: string | null;
  refresh_token?: string | null;
  id_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  session_state?: string | null;
};

export type Session = DefaultSession & {
  id?: number;
  resource_access?: Record<string, string[]>;
  error?: string;
  permissions?: Record<string, string[]>;
  user?: DefaultSession['user'] & {
    id?: string;
    account_id?: number;
    subject?: string;
    hash?: string;
  };
};

// ─── JWT ──────────────────────────────────────────────────────────────────────

export type JWT = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  sub?: string;
  iat?: number;
  exp?: number;
  jti?: string;
  idToken?: string;
  refresh_token?: string;
  access_token?: string;
  account_id?: number;
  user_id?: number;
  resource_access?: Record<string, string[]>;
  expires_at?: number;
  error?: unknown;
  authorization?: {
    permissions?: Array<{
      scopes: Array<string>;
      rsid: string;
      rsname: string;
    }>;
  };
  [key: string]: unknown;
};

// ─── Auth configuration ───────────────────────────────────────────────────────

export interface AuthConfig {
  providers?: unknown[];
  callbacks?: Record<string, unknown>;
  pages?: Record<string, string>;
  session?: {
    strategy?: 'jwt' | 'database';
    maxAge?: number;
    updateAge?: number;
  };
  trustHost?: boolean;
  [key: string]: unknown;
}

// ─── NextAuth result ──────────────────────────────────────────────────────────

export type NextAuthHandlerRecord =
  | ((req: Request) => Promise<Response>)
  | ((req?: Request) => Promise<Response | unknown>);

export type NextAuthHandlers = Record<'GET' | 'POST', NextAuthHandlerRecord>;

export interface NextAuthResult {
  handlers: NextAuthHandlers;
  auth: (...args: unknown[]) => unknown;
  signIn: (...args: unknown[]) => Promise<void>;
  signOut: (...args: unknown[]) => Promise<void>;
}

// ─── Adapter (from @auth/core/adapters) ──────────────────────────────────────

export type AdapterUser = {
  id: string;
  email: string;
  emailVerified: Date | null;
  name?: string | null;
  image?: string | null;
  [key: string]: unknown;
};

export type AdapterAccount = Account & {
  userId: string;
  [key: string]: unknown;
};

export type AdapterSession = {
  sessionToken: string;
  userId: string;
  expires: Date;
  [key: string]: unknown;
};

export type VerificationToken = {
  identifier: string;
  expires: Date;
  token: string;
};

// ─── Provider / CredentialInput (simplified – no @auth/core peer required) ────

/** Simplified shape of an @auth/core provider configuration object. */
export type Provider = {
  id: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
};

/** Simplified shape of a credential input field used in Credentials providers. */
export type CredentialInput = {
  label?: string;
  type?: string;
  placeholder?: string;
  [key: string]: unknown;
};

// ─── NextAuthConfig / AuthNextRequest ────────────────────────────────────────

/** Alias for {@link AuthConfig} that matches the `next-auth` export name. */
export type NextAuthConfig = AuthConfig;

/**
 * Simplified type for the first parameter of the NextAuth GET/POST handler.
 * In practice this is a `NextRequest | Request | undefined`.
 */
export type AuthNextRequest = Request | undefined;

export interface Adapter {
  createUser?: (user: Omit<AdapterUser, 'id'>) => Awaitable<AdapterUser>;
  getUser?: (id: string) => Awaitable<AdapterUser | null>;
  getUserByEmail?: (email: string) => Awaitable<AdapterUser | null>;
  getUserByAccount?: (
    providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>,
  ) => Awaitable<AdapterUser | null>;
  updateUser?: (
    user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>,
  ) => Awaitable<AdapterUser>;
  deleteUser?: (userId: string) => Awaitable<void>;
  linkAccount?: (account: AdapterAccount) => Awaitable<void>;
  unlinkAccount?: (
    providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>,
  ) => Awaitable<void>;
  createSession?: (session: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }) => Awaitable<AdapterSession>;
  getSessionAndUser?: (sessionToken: string) => Awaitable<{
    session: AdapterSession;
    user: AdapterUser;
  } | null>;
  updateSession?: (
    session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>,
  ) => Awaitable<AdapterSession | null | undefined>;
  deleteSession?: (sessionToken: string) => Awaitable<void>;
  createVerificationToken?: (
    verificationToken: VerificationToken,
  ) => Awaitable<VerificationToken | null | undefined>;
  useVerificationToken?: (params: {
    identifier: string;
    token: string;
  }) => Awaitable<VerificationToken | null>;
}
