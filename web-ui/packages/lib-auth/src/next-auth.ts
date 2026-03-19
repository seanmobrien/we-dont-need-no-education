import type { Session } from '@compliance-theater/types';
import type { Awaitable } from '@auth/core/types';

import NextAuth, { type NextAuthResult } from 'next-auth';
import { asNextRequest } from '@compliance-theater/types/lib/nextjs/guards';
import { env } from '@compliance-theater/env';
import { log } from '@compliance-theater/logger/core';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';

import { setupKeyCloakProvider } from './lib/keycloak-provider';

const KnownScopeValues = ['mcp-tool:read', 'mcp-tool:write'] as const;
const KnownScopeIndex = {
	ToolRead: 0,
	ToolReadWrite: 1,
} as const;

type AuthorizedCallback = (params: {
	request: Request;
	auth: Session | null;
}) => Awaitable<boolean | Response | undefined>;

const authorized: AuthorizedCallback = async ({
	auth,
	request: requestFromProps,
}) => {
	const request = asNextRequest(requestFromProps);
	if (request) {
		const { nextUrl } = request;
		const publicFolders = ['/static/', '/.well-known/'];
		const publicPages = ['/', '/privacy'];

		if (publicFolders.some((folder) => nextUrl.pathname.startsWith(folder))) {
			return true;
		}

		if (publicPages.includes(nextUrl.pathname)) {
			return true;
		}

		if (auth && auth.user) {
			if (auth.expires) {
				const expiresAt = new Date(auth.expires).getTime();
				if (Date.now() > expiresAt) {
					log((l) =>
						l.warn('Session has expired', { expiresAt, now: Date.now(), auth })
					);
					return unauthorizedServiceResponse({
						req: request,
						scopes: [
							KnownScopeValues[KnownScopeIndex.ToolRead],
							KnownScopeValues[KnownScopeIndex.ToolReadWrite],
						],
					});
				}
			}
			return true;
		}

		if (nextUrl.pathname.startsWith('/api/') && !auth) {
			return unauthorizedServiceResponse({
				req: request,
				scopes: [
					KnownScopeValues[KnownScopeIndex.ToolRead],
					KnownScopeValues[KnownScopeIndex.ToolReadWrite],
				],
			});
		}
	}

	return !!auth;
};

const providers = [...setupKeyCloakProvider()];

export const providerMap = providers.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	}
	return { id: provider.id, name: provider.name };
});

const nextAuthResult: NextAuthResult = NextAuth({
	callbacks: {
		authorized,
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
	trustHost: env('NEXTAUTH_TRUST_HOST'),
});

export type NextAuthHandlers = NextAuthResult['handlers'];
export type NextAuthAuth = NextAuthResult['auth'];
export type NextAuthSignIn = NextAuthResult['signIn'];
export type NextAuthSignOut = NextAuthResult['signOut'];

export const handlers: NextAuthHandlers = nextAuthResult.handlers;
export const auth: NextAuthAuth = nextAuthResult.auth;
export const signIn: NextAuthSignIn = nextAuthResult.signIn;
export const signOut: NextAuthSignOut = nextAuthResult.signOut;

export type { Session };
