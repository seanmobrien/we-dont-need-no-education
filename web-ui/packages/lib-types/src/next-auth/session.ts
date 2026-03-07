import type {
    DefaultSession,
    Account as BaseAccount,
    User as BaseUser,
} from 'next-auth';
import { } from '../types/next-auth/index';

export type User = BaseUser & {
    id?: string;
    account_id?: number;
    emailVerified?: Date;
    image?: string | null;
    name?: string | null;
    email?: string | null;
    subject?: string;
    hash?: string;
};

export type Account = BaseAccount & {
    provider: string;
};

export type Session = DefaultSession & {
    id?: number;
    error?: string;
    permissions?: Record<string, string[]>;
    resource_access?: Record<string, string[]>;
    user?: DefaultSession['user'] & {
        account_id?: number;
        subject?: string;
        hash?: string;
    };
};

export { DefaultSession };


/*
export type User = BaseUser & {
    id: string | undefined;
    account_id?: number;
    emailVerified?: Date;
    image: string;
    name: string;
    email: string;
    subject: string;
    hash?: string;
};

export type Account = BaseAccount & {
    provider: string;
}
export type Session = DefaultSession & {
    id: number;
    error?: string;
    permissions?: Record<string, string[]>;
};;

export type { DefaultSession };
*/