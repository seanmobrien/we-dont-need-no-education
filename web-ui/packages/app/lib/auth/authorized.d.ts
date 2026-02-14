import { Session } from '@auth/core/types';
import { NextRequest } from 'next/server';
export declare const authorized: ({ auth, request, }: {
    auth: Session | null;
    request?: NextRequest;
}) => Promise<boolean | import("next/server").NextResponse<{
    error: string;
    message: string;
}>>;
//# sourceMappingURL=authorized.d.ts.map