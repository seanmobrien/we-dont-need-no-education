/**
 * Module augmentation for next-auth and @auth/core types.
 * Extends the default types with application-specific fields.
 */
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    account_id?: number;
    subject?: string;
    hash?: string;
  }

  interface Session extends DefaultSession {
    id?: number;
    error?: string;
    permissions?: Record<string, string[]>;
    resource_access?: Record<string, string[]>;
    user?: DefaultSession['user'] & {
      account_id?: number;
      subject?: string;
      hash?: string;
    };
  }
}

declare module '@auth/core/types' {
  interface User {
    account_id?: number;
    subject?: string;
    hash?: string;
  }

  interface Session {
    id?: number;
    error?: string;
    permissions?: Record<string, string[]>;
    resource_access?: Record<string, string[]>;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string;
      account_id?: number;
      subject?: string;
      hash?: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    idToken?: string;
    refresh_token?: string;
    access_token?: string;
    account_id?: number;
    user_id?: number;
    resource_access?: { [key: string]: string[] };
    expires_at?: number;
    error?: unknown;
    subject?: string;
    authorization?: {
      permissions?: Array<{
        scopes: Array<string>;
        rsid: string;
        rsname: string;
      }>;
    };
  }
}

export {};
