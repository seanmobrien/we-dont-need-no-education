type SafeSerializeOptions = {
    maxLen?: number;
    maxPropertyDepth?: number;
    maxObjectDepth?: number;
    maxIterations?: number;
    currentDepth?: number;
    propertyFilter?: (key: string, path: string) => boolean;
    parentPath?: string | null;
    visited?: Set<unknown>;
};
type SafeServerDescriptor = {
    basePath: string | null;
    transportType: string | null;
    transportUrl: string | null;
};
type SafeSerialize = {
    (v: unknown, options?: SafeSerializeOptions | number): string;
    serverDescriptor: (srv: unknown, options?: SafeSerializeOptions) => SafeServerDescriptor;
    argsSummary: (args: unknown[], options?: SafeSerializeOptions) => string;
};
export declare const safeArgsSummary: (args: unknown[], options?: SafeSerializeOptions) => string;
export declare const safeSerialize: SafeSerialize;
export {};
//# sourceMappingURL=safe-serialize.d.ts.map