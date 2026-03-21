import type { Adapter } from '@compliance-theater/auth-compat';

import {
  authCallbackLoaderSpecs,
  type AuthDynamicImports,
  noopSignIn,
  type AuthorizedFn,
  type JwtModule,
  type RedirectModule,
  type SessionModule,
  type SignInFn,
} from './auth-callback-loaders';
import {
  ensureRuntimeModule,
  type RuntimeTarget,
} from './runtime-loader';

const dynamicImports: AuthDynamicImports = {
  auth: {},
} as AuthDynamicImports;

export type LoadedAuthRuntimeDependencies = {
  adapter: Adapter | undefined;
  signInImpl: SignInFn;
  callbacks: {
    authorized: AuthorizedFn;
    jwt: JwtModule['jwt'];
    redirect: RedirectModule['redirect'];
    session: SessionModule['session'];
  };
};

export const loadAuthRuntimeDependencies = async (props: {
  runtime: RuntimeTarget;
  isNodeServerRuntime: boolean;
}): Promise<LoadedAuthRuntimeDependencies> => {
  const { runtime, isNodeServerRuntime } = props;

  let adapter: Adapter | undefined;
  let signInImpl: SignInFn = noopSignIn;

  if (isNodeServerRuntime) {
    dynamicImports.drizzleAdapter = await ensureRuntimeModule({
      label: 'drizzle adapter',
      runtime,
      current: dynamicImports.drizzleAdapter,
      spec: authCallbackLoaderSpecs.drizzleAdapter,
    });
    dynamicImports.auth.signIn = await ensureRuntimeModule({
      label: 'signIn callback',
      runtime,
      current: dynamicImports.auth.signIn,
      spec: authCallbackLoaderSpecs.signIn,
    });

    adapter = await dynamicImports.drizzleAdapter.setupDrizzleAdapter();
    signInImpl = dynamicImports.auth.signIn.signIn;
  }

  dynamicImports.auth.session = await ensureRuntimeModule({
    label: 'session callback',
    runtime,
    current: dynamicImports.auth.session,
    spec: authCallbackLoaderSpecs.session,
  });
  dynamicImports.auth.jwt = await ensureRuntimeModule({
    label: 'jwt callback',
    runtime,
    current: dynamicImports.auth.jwt,
    spec: authCallbackLoaderSpecs.jwt,
  });
  dynamicImports.auth.redirect = await ensureRuntimeModule({
    label: 'redirect callback',
    runtime,
    current: dynamicImports.auth.redirect,
    spec: authCallbackLoaderSpecs.redirect,
  });

  const authorized = await ensureRuntimeModule({
    label: 'authorized callback',
    runtime,
    current: dynamicImports.auth.authorized
      ? { authorized: dynamicImports.auth.authorized }
      : undefined,
    spec: authCallbackLoaderSpecs.authorized,
  });
  dynamicImports.auth.authorized = authorized.authorized;

  return {
    adapter,
    signInImpl,
    callbacks: {
      authorized: dynamicImports.auth.authorized,
      jwt: dynamicImports.auth.jwt.jwt,
      redirect: dynamicImports.auth.redirect.redirect,
      session: dynamicImports.auth.session.session,
    },
  };
};