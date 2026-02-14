import type { JWT } from '@auth/core/jwt';
import type { Account } from '@auth/core/types';
import type { AdapterUser } from '@auth/core/adapters';
import type { NextAuthUserWithAccountId } from './types';
export declare const jwt: ({ token, user, account, }: {
    token: JWT;
    user?: NextAuthUserWithAccountId | AdapterUser | null;
    account?: Account | null;
}) => Promise<JWT>;
//# sourceMappingURL=jwt.d.ts.map