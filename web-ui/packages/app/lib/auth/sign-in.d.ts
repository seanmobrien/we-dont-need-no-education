import { Account, Awaitable, Profile, User } from '@auth/core/types';
import { CredentialInput } from '@auth/core/providers';
import { AdapterUser } from '@auth/core/adapters';
export declare const signIn: (params: {
    user: User | AdapterUser;
    account?: Account | null;
    profile?: Profile;
    email?: {
        verificationRequest?: boolean;
    };
    credentials?: Record<string, CredentialInput>;
}) => Awaitable<boolean | string>;
//# sourceMappingURL=sign-in.d.ts.map