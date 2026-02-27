import type { } from '../types/auth';
import type { } from '../types/auth/core';
import type { } from '../types/auth/core/jwt'
import type { } from '../types/auth/core/types'

import * as auth_core_types from '@auth/core/types';
export { auth_core_types };

import type {
    AuthConfig as BaseAuthConfig,
    Session as BaseSession,
    User as BaseUser,
    Account as BaseAccount,
    Awaitable,
    Profile,
} from '@auth/core/types';

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

export type Session = BaseSession & {
    id?: number;
    resource_access?: Record<string, string[]>;
    error?: string;
    permissions?: Record<string, string[]>;
    user?: BaseSession['user'] & {
        account_id?: number;
        subject?: string;
        hash?: string;
    };
};

export type AuthConfig = BaseAuthConfig;

export type {
    Awaitable,
    Profile
};
