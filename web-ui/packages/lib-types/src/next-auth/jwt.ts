import * as next_auth_jwt from 'next-auth/jwt';
import { JWT as BaseJWT } from 'next-auth/jwt';
export { next_auth_jwt };
export * from 'next-auth/jwt';

export type JWT = BaseJWT & {
    idToken?: string;
    refresh_token?: string;
    access_token?: string;
    account_id?: number;
    user_id?: number;
    resource_access?: { [key: string]: string[] };
    expires_at?: number;
    error?: unknown;
    authorization?: {
        permissions?: Array<{
            scopes: Array<string>;
            rsid: string;
            rsname: string;
        }>;
    }
};
