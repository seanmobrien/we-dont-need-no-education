import type {
  Account,
  User,
  DefaultSession,
  Session,
  Awaitable,
  Profile,
  Adapter,
  AdapterSession,
  AdapterUser,
  CredentialInput,
  JWT,
} from '@compliance-theater/auth-compat';
import { logEvent } from '@compliance-theater/logger';

import type { LoaderSpec } from './runtime-loader';

export type AuthorizedFn = (params: {
  request: Request;
  auth: Session | null;
}) => Awaitable<boolean | Response | undefined>;

export type SessionModule = {
  session: (
    params: ({
      session: { user: AdapterUser } & AdapterSession;
      user: AdapterUser;
    } & {
      session: Session;
      token: JWT;
    }) & {
      newSession: any;
      trigger?: 'update';
    },
  ) => Awaitable<Session | DefaultSession>;
};

export type SignInModule = {
  signIn: (params: {
    user: User | AdapterUser;
    account?: Account | null;
    profile?: Profile;
    email?: {
      verificationRequest?: boolean;
    };
    credentials?: Record<string, CredentialInput>;
  }) => Awaitable<boolean | string>;
};

export type JwtModule = {
  jwt: (params: {
    token: JWT;
    user: User | AdapterUser;
    account?: Account | null;
    profile?: Profile;
    trigger?: 'signIn' | 'signUp' | 'update';
    isNewUser?: boolean;
    session?: any;
  }) => Awaitable<JWT | null>;
};

export type RedirectModule = {
  redirect: (params: {
    url: string;
    baseUrl: string;
  }) => Awaitable<string>;
};

export type DrizzleAdapterModule = {
  setupDrizzleAdapter: () => Promise<Adapter>;
};

export type AuthorizedModule = {
  authorized: AuthorizedFn;
};

export type AuthDynamicImports = {
  drizzleAdapter: DrizzleAdapterModule;
  auth: {
    session: SessionModule;
    signIn: SignInModule;
    jwt: JwtModule;
    redirect: RedirectModule;
    authorized: AuthorizedFn;
  };
};

export type JwtFn = JwtModule['jwt'];
export type SignInFn = SignInModule['signIn'];

export const noopSignIn: SignInFn = async () => {
  logEvent('signIn');
  return false;
};

export const edgeJwtCallback: JwtFn = async ({ token, user }) => {
  if (user?.id) {
    token.id = user.id;
  }

  if (user && 'account_id' in user && !!user.account_id) {
    token.account_id =
      typeof user.account_id === 'number'
        ? user.account_id
        : Number(user.account_id);
  }

  return token;
};

export const authCallbackLoaderSpecs: {
  drizzleAdapter: LoaderSpec<DrizzleAdapterModule>;
  signIn: LoaderSpec<SignInModule>;
  session: LoaderSpec<SessionModule>;
  jwt: LoaderSpec<JwtModule>;
  redirect: LoaderSpec<RedirectModule>;
  authorized: LoaderSpec<AuthorizedModule>;
} = {
  drizzleAdapter: {
    loaders: {
      node: () => import('./drizzle-adapter'),
    },
    isValid: (value) => typeof value?.setupDrizzleAdapter === 'function',
  },
  signIn: {
    loaders: {
      node: () => import('./sign-in'),
    },
    isValid: (value) => typeof value?.signIn === 'function',
  },
  session: {
    loaders: {
      edge: () => import('./session/session-edge'),
      node: () => import('./session/session-nodejs'),
    },
    isValid: (value) => typeof value?.session === 'function',
  },
  jwt: {
    loaders: {
      edge: async () => ({ jwt: edgeJwtCallback }),
      node: () => import('./jwt'),
    },
    isValid: (value) => typeof value?.jwt === 'function',
  },
  redirect: {
    loaders: {
      default: () => import('./redirect'),
    },
    isValid: (value) => typeof value?.redirect === 'function',
  },
  authorized: {
    loaders: {
      default: async () => ({
        authorized: (await import('./authorized')).authorized,
      }),
    },
    isValid: (value) => typeof value?.authorized === 'function',
  },
};