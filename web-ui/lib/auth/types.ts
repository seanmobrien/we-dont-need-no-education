import { Session } from '@auth/core/types';
import { User as NextAuthUser } from 'next-auth'; // Added NextAuthConfig

export type NextAuthUserWithAccountId = NextAuthUser & {
  account_id?: number;
  hash?: string;
};

export type SessionWithAccountId = Session & {
  user?: NextAuthUserWithAccountId;
};
