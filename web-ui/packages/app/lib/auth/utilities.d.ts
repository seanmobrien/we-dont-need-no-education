import { type JWT } from '@auth/core/jwt';
import { type JWTPayload } from 'jose';
export declare const KnownScopeValues: readonly ["mcp-tool:read", "mcp-tool:write"];
export type KnownScope = (typeof KnownScopeValues)[number];
export declare const KnownScopeIndex: {
    readonly ToolRead: 0;
    readonly ToolReadWrite: 1;
};
export declare const SessionTokenKey: () => string;
export declare const extractToken: (req: Request) => Promise<JWT | null>;
export declare const decodeToken: (props: {
    token: string;
    verify?: boolean;
    issuer?: string;
} | string) => Promise<JWTPayload>;
//# sourceMappingURL=utilities.d.ts.map