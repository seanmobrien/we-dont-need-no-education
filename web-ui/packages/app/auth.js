import NextAuth from 'next-auth';
import { isRunningOnEdge, env } from '@compliance-theater/env';
import { logEvent } from '@compliance-theater/logger';
import { setupKeyCloakProvider } from './lib/auth/keycloak-provider';
import { authorized } from './lib/auth/authorized';
const dynamicImports = {
    auth: {},
};
const providers = [...setupKeyCloakProvider()];
export const providerMap = providers.map((provider) => {
    if (typeof provider === 'function') {
        const providerData = provider();
        return { id: providerData.id, name: providerData.name };
    }
    return { id: provider.id, name: provider.name };
});
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
    let adapter;
    let signInImpl;
    if (process.env.NEXT_RUNTIME === 'nodejs' &&
        typeof window === 'undefined' &&
        !isRunningOnEdge() &&
        process.env.NEXT_PHASE !== 'phase-production-build') {
        if (!dynamicImports.drizzleAdapter) {
            dynamicImports.drizzleAdapter = await import('@/lib/auth/drizzle-adapter');
        }
        if (!dynamicImports.auth.signIn) {
            dynamicImports.auth.signIn = await import('@/lib/auth/sign-in');
        }
        const { auth: { signIn: { signIn }, }, drizzleAdapter: { setupDrizzleAdapter }, } = dynamicImports;
        adapter = await setupDrizzleAdapter();
        signInImpl = signIn;
    }
    else {
        adapter = undefined;
        signInImpl = async () => {
            logEvent('signIn');
            return false;
        };
    }
    if (!dynamicImports.auth.session) {
        if (typeof window === 'undefined' &&
            process.env.NEXT_RUNTIME !== 'nodejs') {
            dynamicImports.auth.session = await import('@/lib/auth/session/session-edge');
        }
        else if (typeof window === 'undefined' &&
            process.env.NEXT_RUNTIME === 'nodejs') {
            dynamicImports.auth.session = await import('@/lib/auth/session/session-nodejs');
        }
        if (!dynamicImports.auth.session.session) {
            throw new Error('Failed to load session callback');
        }
    }
    const session = dynamicImports.auth.session.session;
    if (!dynamicImports.auth.jwt) {
        dynamicImports.auth.jwt = await import('@/lib/auth/jwt');
        if (!dynamicImports.auth.jwt.jwt) {
            throw new Error('Failed to load jwt callback');
        }
    }
    const jwt = dynamicImports.auth.jwt.jwt;
    if (!dynamicImports.auth.redirect) {
        dynamicImports.auth.redirect = await import('@/lib/auth/redirect');
        if (!dynamicImports.auth.redirect.redirect) {
            throw new Error('Failed to load redirect callback');
        }
    }
    const redirect = dynamicImports.auth.redirect.redirect;
    return {
        adapter,
        callbacks: {
            authorized,
            signIn: signInImpl,
            jwt,
            session,
            redirect,
        },
        providers,
        pages: {
            signIn: '/auth/signin',
        },
        session: {
            strategy: 'jwt',
            maxAge: 30 * 60,
            updateAge: 5 * 60,
        },
        theme: {
            colorScheme: 'auto',
            logo: '/static/logo/logo-dark.png',
            brandColor: '#1898a8',
        },
        trustHost: env('NEXTAUTH_TRUST_HOST'),
    };
});
//# sourceMappingURL=auth.js.map