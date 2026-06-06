import NextAuth from 'next-auth';

import type { Awaitable, AuthConfig, NextAuthResult } from './contracts';

type NextAuthFactory = (
  config: AuthConfig | ((request: Request | undefined) => Awaitable<AuthConfig>),
) => NextAuthResult;

export const nextAuth: NextAuthFactory = NextAuth as unknown as NextAuthFactory;
