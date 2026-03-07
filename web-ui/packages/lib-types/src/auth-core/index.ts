import { } from '../types/auth/core/jwt';
import { } from '../types/auth/core/types';
import { } from '../types/auth/core/index';

import * as auth_core from '@auth/core';
import {
    Session,
    User,
    Account,
    AuthConfig,
} from './types';
export { auth_core };

import { JWT } from './jwt';
import { Adapter } from './adapters';

export * from '@auth/core';
export * from './adapters';
export * from './errors';
export * from './providers';
export * from './types';
export type {
    Session,
    User,
    Account,
    AuthConfig,
    JWT,
    Adapter,
};

