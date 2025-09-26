import { DefaultSession, Account as BaseAccount } from 'next-auth';
import { JWT as BaseJWT } from 'next-auth/jwt';
declare module 'next-auth' {
  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    id: string | undefined;
    account_id?: number;
    emailVerified?: Date;
    image: string;
    name: string;
    email: string;
    subject: string;
  }
  /**
   * The shape of the account object returned in the OAuth providers' `account` callback,
   * Usually contains information about the provider being used, like OAuth tokens (`access_token`, etc).
   */
  interface Account extends BaseAccount {
    provider: string;
  }
  /**
   * Returned by `useSession`, `auth`, contains information about the active session.
   */
  interface Session extends DefaultSession {
    id: number;
  }
}

// The `JWT` interface can be found in the `next-auth/jwt` submodule

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT extends BaseJWT {
    /** OpenID ID Token */
    idToken?: string;
    /** Refresh Token */
    refresh_token?: string;
    /** Access Token */
    access_token?: string;
    /** Account ID */
    account_id?: number;
    /** User ID */
    user_id?: number;
  }
}
