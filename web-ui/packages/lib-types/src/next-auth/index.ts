import type { NextAuthResult as BaseNextAuthResult } from 'next-auth';
import * as next_auth from 'next-auth';

// Include NextAuth/Auth.js module augmentations
import {
    Session,
    User,
    Account
} from './session';
import { JWT } from './jwt';
import { FirstParameter } from '../types/typescript/parameters';

export { next_auth };
export { default } from 'next-auth';
export * from 'next-auth';

export type {
    Session,
    User,
    Account,
    JWT
};

type StockNextAuthHandlers = BaseNextAuthResult["handlers"];

export type NextAuthHandlerRecord = (
    ((req: Request) => Promise<Response>)
    | StockNextAuthHandlers['GET' | 'POST']
);

export type NextAuthHandlers = Record<
    "GET" | "POST",
    NextAuthHandlerRecord
>;


export type AuthNextRequest = FirstParameter<StockNextAuthHandlers["GET"]>;

/**
 * Overrides stock nextauth result object to support portable handlers.
 */
export type NextAuthResult = Omit<BaseNextAuthResult, 'handlers'> & {
    handlers: NextAuthHandlers;
};
