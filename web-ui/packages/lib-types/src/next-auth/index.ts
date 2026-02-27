import * as next_auth from 'next-auth';
// Include NextAuth/Auth.js module augmentations
import {
    Session,
    User,
    Account
} from './session';
import { JWT } from './jwt';

export { next_auth };
export { default } from 'next-auth';
export * from 'next-auth';

export type {
    Session,
    User,
    Account,
    JWT,
};
