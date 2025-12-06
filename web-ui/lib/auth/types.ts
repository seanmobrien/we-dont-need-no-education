import type { Session, User as NextAuthUser } from '@auth/core/types';

type NextAuthUserWithAccountId = NextAuthUser;
type SessionWithAccountId = Session;

export type { NextAuthUserWithAccountId, SessionWithAccountId };
