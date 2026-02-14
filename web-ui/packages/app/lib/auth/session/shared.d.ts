import type { JWT } from '@auth/core/jwt';
import type { SessionWithAccountId } from '../types';
import type { Session } from '@auth/core/types';
export declare const setupSession: ({ session: sessionFromProps, token, hash, }: {
    hash: (input: string) => Promise<string>;
    session: Session;
    token: JWT;
}) => Promise<SessionWithAccountId>;
//# sourceMappingURL=shared.d.ts.map